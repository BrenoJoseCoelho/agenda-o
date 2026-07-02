import type { Appointment, Contact, Service } from "@/generated/prisma/client";

type AppointmentForFeed = Appointment & { contact: Contact; service: Service };

function formatUtc(date: Date): string {
  // ICS UTC format: YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Builds an RFC 5545 VCALENDAR feed of a business's appointments.
// Any calendar app (Apple, Google, Outlook) can subscribe to this via URL.
export function buildIcsFeed(businessName: string, appointments: AppointmentForFeed[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Atende AI//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`Atende AI - ${businessName}`)}`,
  ];

  for (const appt of appointments) {
    const end = new Date(appt.scheduledAt.getTime() + appt.service.durationMinutes * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${appt.id}@atende-ai`,
      `DTSTAMP:${formatUtc(appt.createdAt)}`,
      `DTSTART:${formatUtc(appt.scheduledAt)}`,
      `DTEND:${formatUtc(end)}`,
      `SUMMARY:${escapeText(`${appt.service.name} - ${appt.contact.name}`)}`,
      `DESCRIPTION:${escapeText(`Cliente: ${appt.contact.name} (${appt.contact.phone})`)}`,
      `STATUS:${appt.status === "CANCELADO" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  // ICS lines are CRLF-terminated.
  return lines.join("\r\n");
}
