import { prisma } from "@/lib/prisma";
import type { Business, CalendarProvider } from "@/generated/prisma/client";
import type { CalendarProviderAdapter } from "./types";
import { googleProvider } from "./google";

// Provider registry. Adding a new scheduling system = add its adapter here.
const PROVIDERS: Record<CalendarProvider, CalendarProviderAdapter | null> = {
  GOOGLE: googleProvider,
  OUTLOOK: null, // planned — the adapter interface is ready for it
};

export const PROVIDER_META: {
  id: CalendarProvider;
  label: string;
  description: string;
  available: boolean;
}[] = [
  {
    id: "GOOGLE",
    label: "Google Calendar",
    description: "Sincroniza agendamentos e checa conflitos na agenda do Google.",
    available: googleProvider.isConfigured(),
  },
  {
    id: "OUTLOOK",
    label: "Outlook / Microsoft 365",
    description: "Em breve.",
    available: false,
  },
];

export function getAdapter(provider: CalendarProvider): CalendarProviderAdapter | null {
  return PROVIDERS[provider];
}

export type AvailabilityResult = { available: true } | { available: false; reason: string };

const DEFAULT_DURATION_MIN = 30;

/**
 * Checks whether a slot is free, considering both our own confirmed appointments
 * (prevents double-booking within Atende AI) and any connected external calendar.
 */
export async function checkAvailability(
  business: Business,
  start: Date,
  durationMinutes: number = DEFAULT_DURATION_MIN
): Promise<AvailabilityResult> {
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  // 1) Internal conflicts: another confirmed appointment overlapping this slot.
  const internal = await prisma.appointment.findFirst({
    where: {
      businessId: business.id,
      status: "CONFIRMADO",
      // overlap: existing.start < newEnd AND existing.start >= newStart-ish.
      // We only store start; approximate overlap using a window around the slot.
      scheduledAt: { gte: new Date(start.getTime() - 55 * 60_000), lt: end },
    },
  });
  if (internal) {
    return { available: false, reason: "ja existe um agendamento nesse horario" };
  }

  // 2) External calendar busy times, if a provider is connected.
  const connection = await prisma.calendarConnection.findFirst({
    where: { businessId: business.id, status: "ATIVA" },
  });
  if (connection) {
    const adapter = getAdapter(connection.provider);
    if (adapter?.isConfigured()) {
      try {
        const busy = await adapter.getBusy(connection, start, end);
        const conflict = busy.some((b) => b.start < end && b.end > start);
        if (conflict) {
          return { available: false, reason: "esse horario esta ocupado na agenda" };
        }
      } catch {
        // If the calendar API fails, don't block booking — fall back to internal-only.
      }
    }
  }

  return { available: true };
}

/**
 * Pushes a confirmed appointment to the connected external calendar (if any) and
 * returns the provider + event id so it can be stored on the Appointment.
 */
export async function pushEventToCalendar(params: {
  business: Business;
  summary: string;
  description?: string;
  start: Date;
  durationMinutes: number;
}): Promise<{ provider: CalendarProvider; eventId: string } | null> {
  const { business, summary, description, start, durationMinutes } = params;

  const connection = await prisma.calendarConnection.findFirst({
    where: { businessId: business.id, status: "ATIVA" },
  });
  if (!connection) return null;

  const adapter = getAdapter(connection.provider);
  if (!adapter?.isConfigured()) return null;

  try {
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const { eventId } = await adapter.createEvent(connection, {
      summary,
      description,
      start,
      end,
      timezone: business.timezone,
    });
    return { provider: connection.provider, eventId };
  } catch {
    // Non-fatal: the appointment is still saved in our DB even if the calendar push fails.
    return null;
  }
}

// Best-effort removal of an event on the connected external calendar (on cancel/reschedule).
export async function deleteExternalEvent(
  businessId: string,
  provider: CalendarProvider,
  eventId: string
): Promise<void> {
  const connection = await prisma.calendarConnection.findFirst({
    where: { businessId, provider, status: "ATIVA" },
  });
  if (!connection) return;
  const adapter = getAdapter(provider);
  if (!adapter?.isConfigured()) return;
  try {
    await adapter.deleteEvent(connection, eventId);
  } catch {
    // ignore — the internal record is the source of truth
  }
}
