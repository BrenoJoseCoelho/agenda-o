import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import type { CalendarConnection } from "@/generated/prisma/client";
import type { BusyInterval, CalendarEventInput, CalendarProviderAdapter, CreatedEvent } from "./types";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
];

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function baseUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

function redirectUri() {
  return `${baseUrl()}/api/integrations/google/callback`;
}

export function makeOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri()
  );
}

// URL the business owner is sent to in order to grant access. `state` carries the businessId.
export function buildConsentUrl(state: string) {
  const client = makeOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token on every connect
    scope: SCOPES,
    state,
  });
}

export async function exchangeCode(code: string) {
  const client = makeOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let email: string | undefined;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();
    email = me.data.email ?? undefined;
  } catch {
    // userinfo is best-effort; the connection works without the email label
  }

  return { tokens, email };
}

// Returns an OAuth client authorized for this connection, refreshing + persisting
// the access token when it is missing or close to expiry.
async function authorizedClient(connection: CalendarConnection) {
  const client = makeOAuthClient();
  client.setCredentials({
    access_token: connection.accessToken ?? undefined,
    refresh_token: connection.refreshToken ?? undefined,
    expiry_date: connection.expiresAt ? connection.expiresAt.getTime() : undefined,
  });

  const soon = Date.now() + 60_000;
  const needsRefresh = !connection.accessToken || !connection.expiresAt || connection.expiresAt.getTime() < soon;

  if (needsRefresh && connection.refreshToken) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: credentials.access_token ?? connection.accessToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : connection.expiresAt,
        status: "ATIVA",
      },
    });
  }

  return client;
}

export const googleProvider: CalendarProviderAdapter = {
  id: "GOOGLE",
  label: "Google Calendar",

  isConfigured: googleConfigured,

  async getBusy(connection: CalendarConnection, from: Date, to: Date): Promise<BusyInterval[]> {
    const auth = await authorizedClient(connection);
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        items: [{ id: connection.calendarId }],
      },
    });
    const busy = res.data.calendars?.[connection.calendarId]?.busy ?? [];
    return busy
      .filter((b) => b.start && b.end)
      .map((b) => ({ start: new Date(b.start as string), end: new Date(b.end as string) }));
  },

  async createEvent(connection: CalendarConnection, event: CalendarEventInput): Promise<CreatedEvent> {
    const auth = await authorizedClient(connection);
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.insert({
      calendarId: connection.calendarId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.start.toISOString(), timeZone: event.timezone },
        end: { dateTime: event.end.toISOString(), timeZone: event.timezone },
      },
    });
    return { eventId: res.data.id ?? "" };
  },

  async deleteEvent(connection: CalendarConnection, eventId: string): Promise<void> {
    try {
      const auth = await authorizedClient(connection);
      const calendar = google.calendar({ version: "v3", auth });
      await calendar.events.delete({ calendarId: connection.calendarId, eventId });
    } catch {
      // ignore already-deleted / not-found
    }
  },
};
