import type { CalendarConnection } from "@/generated/prisma/client";

export type BusyInterval = { start: Date; end: Date };

export type CalendarEventInput = {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  timezone: string;
};

export type CreatedEvent = { eventId: string };

// A calendar provider abstracts a single external system (Google, Outlook, ...).
// Adding a new scheduling system = implementing this interface + registering it.
export interface CalendarProviderAdapter {
  readonly id: "GOOGLE" | "OUTLOOK";
  readonly label: string;
  // Whether the server has the credentials (env vars) needed to offer this provider.
  isConfigured(): boolean;
  // Busy intervals in [from, to] for the connected calendar.
  getBusy(connection: CalendarConnection, from: Date, to: Date): Promise<BusyInterval[]>;
  // Create an event; returns the external event id.
  createEvent(connection: CalendarConnection, event: CalendarEventInput): Promise<CreatedEvent>;
  // Best-effort cancel; should not throw on already-deleted events.
  deleteEvent(connection: CalendarConnection, eventId: string): Promise<void>;
}
