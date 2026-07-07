import { prisma } from "@/lib/prisma";
import type { RentalUnit, ReservationSource } from "@/generated/prisma/client";
import { parseIcal } from "@/lib/ical";

// Reservas que "ocupam" a unidade (bloqueiam datas). CANCELADA nao conta.
const BLOCKING = ["CONFIRMADA", "BLOQUEADA"] as const;

export function nights(checkIn: Date, checkOut: Date): number {
  return Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000));
}

// Intervalos meio-abertos [in, out): o dia de check-out fica livre para o proximo.
// Ha choque quando aIn < bOut && bIn < aOut.
export async function isUnitAvailable(
  unitId: string,
  checkIn: Date,
  checkOut: Date,
  ignoreReservationId?: string
): Promise<boolean> {
  if (nights(checkIn, checkOut) < 1) return false;
  const overlap = await prisma.reservation.findFirst({
    where: {
      unitId,
      status: { in: [...BLOCKING] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      ...(ignoreReservationId ? { id: { not: ignoreReservationId } } : {}),
    },
  });
  return !overlap;
}

// Cria uma reserva direta (feita aqui) apos checar disponibilidade.
export async function createDirectReservation(params: {
  unitId: string;
  checkIn: Date;
  checkOut: Date;
  contactId?: string;
  guestName?: string;
}): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const available = await isUnitAvailable(params.unitId, params.checkIn, params.checkOut);
  if (!available) return { ok: false, reason: "essas datas ja estao ocupadas" };
  const r = await prisma.reservation.create({
    data: {
      unitId: params.unitId,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      contactId: params.contactId,
      guestName: params.guestName,
      source: "DIRETO",
      status: "CONFIRMADA",
    },
  });
  return { ok: true, id: r.id };
}

function sourceFromLabel(label: string): ReservationSource {
  const l = label.toLowerCase();
  if (l.includes("airbnb")) return "AIRBNB";
  if (l.includes("booking")) return "BOOKING";
  return "OUTRO";
}

// Baixa e importa os feeds externos de uma unidade, criando/atualizando os
// bloqueios (para nunca dobrar reserva com o Airbnb) e removendo os que sumiram.
export async function syncUnitFeeds(
  unit: RentalUnit & { feeds: { id: string; label: string; url: string }[] }
): Promise<{ imported: number; feeds: number }> {
  let imported = 0;
  for (const feed of unit.feeds) {
    const source = sourceFromLabel(feed.label);
    let text = "";
    try {
      const res = await fetch(feed.url, { headers: { "User-Agent": "AtendeAI/1.0" } });
      if (!res.ok) continue;
      text = await res.text();
    } catch {
      continue; // rede indisponivel: mantem o que ja tinha
    }

    const events = parseIcal(text);
    const seenUids = new Set<string>();
    for (const ev of events) {
      const uid = `${source}:${ev.uid}`;
      seenUids.add(uid);
      const existing = await prisma.reservation.findFirst({
        where: { unitId: unit.id, externalUid: uid },
      });
      if (existing) {
        await prisma.reservation.update({
          where: { id: existing.id },
          data: { checkIn: ev.start, checkOut: ev.end, status: "BLOQUEADA" },
        });
      } else {
        await prisma.reservation.create({
          data: {
            unitId: unit.id,
            checkIn: ev.start,
            checkOut: ev.end,
            status: "BLOQUEADA",
            source,
            externalUid: uid,
            guestName: ev.summary || feed.label,
          },
        });
        imported += 1;
      }
    }

    // Remove bloqueios desta fonte que sumiram do feed (cancelados no canal).
    const stale = await prisma.reservation.findMany({
      where: { unitId: unit.id, source, status: "BLOQUEADA", externalUid: { not: null } },
    });
    const toDelete = stale.filter((r) => r.externalUid && !seenUids.has(r.externalUid));
    if (toDelete.length) {
      await prisma.reservation.deleteMany({ where: { id: { in: toDelete.map((r) => r.id) } } });
    }

    await prisma.unitCalendarFeed.update({
      where: { id: feed.id },
      data: { lastSyncAt: new Date() },
    });
  }
  return { imported, feeds: unit.feeds.length };
}

// Sincroniza todas as unidades de negocios de hospedagem (usado pelo cron).
export async function syncAllFeeds(): Promise<{ units: number; imported: number }> {
  const units = await prisma.rentalUnit.findMany({
    where: { active: true, feeds: { some: {} } },
    include: { feeds: true },
  });
  let imported = 0;
  for (const unit of units) {
    const r = await syncUnitFeeds(unit);
    imported += r.imported;
  }
  return { units: units.length, imported };
}
