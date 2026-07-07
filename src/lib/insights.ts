import { prisma } from "@/lib/prisma";

// "Gerente virtual": transforma os agendamentos em leituras que o dono não vê
// olhando a agenda — o que fatura mais, quando, e quem está sumindo.

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const CHURN_DAYS = 30; // sem voltar há mais de X dias = risco de sumir

export type TopService = { name: string; count: number; revenueCents: number };
export type ChurnClient = { name: string; phone: string; daysAway: number; lastService: string };
export type BusinessInsights = {
  topServices: TopService[];
  bestWeekday: { label: string; revenueCents: number } | null;
  bestHour: { label: string; revenueCents: number } | null;
  churnRisk: ChurnClient[];
  forecast: {
    realizedCents: number; // já faturado no mês
    bookedCents: number; // já agendado no resto do mês
    projectionCents: number; // projeção de fechamento do mês
  };
  hasData: boolean;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function daysInMonth(d: Date) {
  return endOfMonth(d).getDate();
}

export async function getBusinessInsights(businessId: string): Promise<BusinessInsights> {
  const now = new Date();

  const appts = await prisma.appointment.findMany({
    where: { businessId, status: { not: "CANCELADO" } },
    include: { service: true, contact: true },
    orderBy: { scheduledAt: "asc" },
  });

  // ---- Serviços que mais faturam ----
  const svcMap = new Map<string, TopService>();
  for (const a of appts) {
    const cur = svcMap.get(a.serviceId) ?? { name: a.service.name, count: 0, revenueCents: 0 };
    cur.count += 1;
    cur.revenueCents += a.service.priceCents;
    svcMap.set(a.serviceId, cur);
  }
  const topServices = [...svcMap.values()]
    .sort((x, y) => y.revenueCents - x.revenueCents)
    .slice(0, 5);

  // ---- Dia da semana / horário mais rentável ----
  const weekdayRev = new Array(7).fill(0);
  const hourRev = new Array(24).fill(0);
  for (const a of appts) {
    const d = new Date(a.scheduledAt);
    weekdayRev[d.getDay()] += a.service.priceCents;
    hourRev[d.getHours()] += a.service.priceCents;
  }
  const bestWeekdayIdx = weekdayRev.reduce((best, v, i) => (v > weekdayRev[best] ? i : best), 0);
  const bestHourIdx = hourRev.reduce((best, v, i) => (v > hourRev[best] ? i : best), 0);
  const bestWeekday = weekdayRev[bestWeekdayIdx] > 0
    ? { label: WEEKDAYS[bestWeekdayIdx], revenueCents: weekdayRev[bestWeekdayIdx] }
    : null;
  const bestHour = hourRev[bestHourIdx] > 0
    ? { label: `${String(bestHourIdx).padStart(2, "0")}h`, revenueCents: hourRev[bestHourIdx] }
    : null;

  // ---- Clientes prestes a sumir ----
  // Para cada contato: última visita passada e se tem agendamento futuro.
  type Agg = { name: string; phone: string; lastPast?: Date; lastService: string; hasFuture: boolean };
  const byContact = new Map<string, Agg>();
  for (const a of appts) {
    const agg = byContact.get(a.contactId) ?? {
      name: a.contact.name,
      phone: a.contact.phone,
      lastService: a.service.name,
      hasFuture: false,
    };
    const when = new Date(a.scheduledAt);
    if (when > now) {
      agg.hasFuture = true;
    } else if (!agg.lastPast || when > agg.lastPast) {
      agg.lastPast = when;
      agg.lastService = a.service.name;
    }
    byContact.set(a.contactId, agg);
  }
  const churnRisk: ChurnClient[] = [...byContact.values()]
    .filter((c) => c.lastPast && !c.hasFuture)
    .map((c) => ({
      name: c.name,
      phone: c.phone,
      daysAway: Math.floor((now.getTime() - c.lastPast!.getTime()) / 86_400_000),
      lastService: c.lastService,
    }))
    .filter((c) => c.daysAway >= CHURN_DAYS)
    .sort((a, b) => b.daysAway - a.daysAway)
    .slice(0, 8);

  // ---- Previsão de faturamento do mês ----
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  let realizedCents = 0;
  let bookedCents = 0;
  for (const a of appts) {
    const when = new Date(a.scheduledAt);
    if (when < mStart || when > mEnd) continue;
    if (when <= now) realizedCents += a.service.priceCents;
    else bookedCents += a.service.priceCents;
  }
  const dayOfMonth = now.getDate();
  const totalDays = daysInMonth(now);
  const remainingDays = Math.max(0, totalDays - dayOfMonth);
  // Ritmo diário do que já foi realizado, projetado para os dias que faltam
  // (estimativa de novos clientes que ainda vão marcar em cima da hora).
  const dailyRate = dayOfMonth > 0 ? realizedCents / dayOfMonth : 0;
  const estimatedNewCents = Math.round(dailyRate * remainingDays);
  const projectionCents = realizedCents + bookedCents + estimatedNewCents;

  return {
    topServices,
    bestWeekday,
    bestHour,
    churnRisk,
    forecast: { realizedCents, bookedCents, projectionCents },
    hasData: appts.length > 0,
  };
}
