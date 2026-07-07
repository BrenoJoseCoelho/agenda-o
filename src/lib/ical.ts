// iCal minimalista para hospedagem: le os feeds do Airbnb/Booking (import) e
// gera o feed das reservas diretas (export). Trabalha em granularidade de dia
// (meia-noite UTC), que e o suficiente para bloquear datas de estadia.

export type IcalEvent = { uid: string; start: Date; end: Date; summary: string };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// "20260710" ou "20260710T140000Z" -> Date meia-noite UTC daquele dia.
function parseIcalDate(value: string): Date | null {
  const m = value.match(/(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

// Data "YYYY-MM-DD" -> Date meia-noite UTC (para entradas da IA / do painel).
export function parseDateOnly(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function toIcalDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

// Desdobra linhas continuadas (RFC 5545) e extrai os VEVENTs.
export function parseIcal(text: string): IcalEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: IcalEvent[] = [];
  let cur: Partial<IcalEvent> | null = null;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      cur = { summary: "" };
    } else if (line.startsWith("END:VEVENT")) {
      if (cur?.start && cur.end) {
        events.push({
          uid: cur.uid || `${toIcalDate(cur.start)}-${toIcalDate(cur.end)}`,
          start: cur.start,
          end: cur.end,
          summary: cur.summary || "",
        });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx);
      const val = line.slice(idx + 1).trim();
      if (key.startsWith("DTSTART")) cur.start = parseIcalDate(val) ?? undefined;
      else if (key.startsWith("DTEND")) cur.end = parseIcalDate(val) ?? undefined;
      else if (key === "UID") cur.uid = val;
      else if (key === "SUMMARY") cur.summary = val;
    }
  }
  return events;
}

// Gera o feed iCal das reservas diretas para o Airbnb/Booking importarem.
export function buildUnitIcal(
  unitName: string,
  reservations: { id: string; checkIn: Date; checkOut: Date }[]
): string {
  const now = new Date();
  const stamp = `${toIcalDate(now)}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(
    now.getUTCSeconds()
  )}Z`;

  const events = reservations
    .map((r) =>
      [
        "BEGIN:VEVENT",
        `UID:${r.id}@atende-ai`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${toIcalDate(r.checkIn)}`,
        `DTEND;VALUE=DATE:${toIcalDate(r.checkOut)}`,
        "SUMMARY:Reservado (Atende AI)",
        "END:VEVENT",
      ].join("\r\n")
    )
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Atende AI//Hospedagem//PT",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${unitName}`,
    events,
    "END:VCALENDAR",
    "",
  ]
    .filter(Boolean)
    .join("\r\n");
}
