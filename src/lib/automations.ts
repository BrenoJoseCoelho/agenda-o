import { prisma } from "@/lib/prisma";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import type { Business } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Automacoes proativas — o que separa "bot que responde" de "software que gera
// receita". Cada empresa liga/desliga no Cerebro. Um agendador (cron) chama
// runAutomationsForBusiness periodicamente; sem WhatsApp conectado, as mensagens
// sao apenas logadas (modo demo), mas os candidatos ja aparecem na previa.
// ---------------------------------------------------------------------------

export type AutomationKind = "WIN_BACK" | "NO_SHOW" | "IDLE_SLOT";

export type AutomationCandidate = {
  kind: AutomationKind;
  contactId: string;
  contactName: string;
  phone: string;
  message: string;
  // referencia para marcar como enviado
  conversationId?: string;
  appointmentId?: string;
};

function firstName(name: string) {
  return name.split(" ")[0];
}

function greetingSuffix(business: Business) {
  return business.signature ? ` ${business.signature}` : "";
}

// Preenche as variaveis {cliente} {negocio} {servico} {horario} {assinatura}
// no modelo editado pelo dono.
function renderTemplate(
  template: string,
  vars: { cliente: string; negocio: string; servico?: string; horario?: string; assinatura?: string }
): string {
  return template
    .replace(/\{cliente\}/gi, vars.cliente)
    .replace(/\{negocio\}/gi, vars.negocio)
    .replace(/\{servico\}/gi, vars.servico ?? "")
    .replace(/\{horario\}/gi, vars.horario ?? "")
    .replace(/\{assinatura\}/gi, vars.assinatura ?? "")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

// 1) WIN-BACK — cliente que demonstrou interesse e sumiu sem agendar.
async function winBackCandidates(business: Business): Promise<AutomationCandidate[]> {
  if (!business.winBackEnabled) return [];
  const cutoff = new Date(Date.now() - business.winBackDays * 24 * 60 * 60 * 1000);

  const conversations = await prisma.conversation.findMany({
    where: {
      businessId: business.id,
      status: { in: ["NOVA", "EM_ATENDIMENTO"] },
      lastMessageAt: { lt: cutoff },
      winBackSentAt: null,
    },
    include: { contact: true, messages: { orderBy: { createdAt: "asc" }, take: 1 } },
    orderBy: { lastMessageAt: "asc" },
    take: 50,
  });

  return conversations
    .filter((c) => c.messages.length > 0)
    .map((c) => {
      const cliente = firstName(c.contact.name);
      const message = business.winBackTemplate
        ? renderTemplate(business.winBackTemplate, {
            cliente,
            negocio: business.name,
            assinatura: business.signature ?? "",
          })
        : `Oi ${cliente}! Aqui e a ${business.aiName} da ${business.name} 😊 ` +
          `Vi que voce chegou a falar com a gente mas nao fechou seu horario. ` +
          `Quer que eu ja deixe marcado?${greetingSuffix(business)}`;
      return {
        kind: "WIN_BACK" as const,
        contactId: c.contactId,
        contactName: c.contact.name,
        phone: c.contact.phone,
        conversationId: c.id,
        message,
      };
    });
}

// 2) NO-SHOW — lembrete no dia anterior para quem tem horario marcado.
async function noShowCandidates(business: Business): Promise<AutomationCandidate[]> {
  if (!business.noShowReminderEnabled) return [];
  const now = new Date();
  const in36h = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const appts = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
      status: "CONFIRMADO",
      reminderSentAt: null,
      scheduledAt: { gt: now, lt: in36h },
    },
    include: { contact: true, service: true },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  return appts.map((a) => {
    const when = a.scheduledAt.toLocaleString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const cliente = firstName(a.contact.name);
    const message = business.noShowTemplate
      ? renderTemplate(business.noShowTemplate, {
          cliente,
          negocio: business.name,
          servico: a.service.name,
          horario: when,
          assinatura: business.signature ?? "",
        })
      : `Oi ${cliente}! So confirmando seu ${a.service.name} ${when}. ` +
        `Ta de pe? Se precisar remarcar e so me avisar.${greetingSuffix(business)}`;
    return {
      kind: "NO_SHOW" as const,
      contactId: a.contactId,
      contactName: a.contact.name,
      phone: a.contact.phone,
      appointmentId: a.id,
      message,
    };
  });
}

// 3) IDLE SLOT — dia de amanha com pouca ocupacao: oferece para leads recentes.
async function idleSlotCandidates(business: Business): Promise<AutomationCandidate[]> {
  if (!business.idleSlotEnabled) return [];

  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(now.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const bookedTomorrow = await prisma.appointment.count({
    where: {
      businessId: business.id,
      status: "CONFIRMADO",
      scheduledAt: { gte: tomorrowStart, lte: tomorrowEnd },
    },
  });

  // Heuristica simples de "agenda vazia": menos de 3 agendamentos amanha.
  if (bookedTomorrow >= 3) return [];

  // Oferece para contatos recentes que nao tem horario futuro marcado.
  const contacts = await prisma.contact.findMany({
    where: {
      businessId: business.id,
      appointments: { none: { scheduledAt: { gt: now }, status: "CONFIRMADO" } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return contacts.map((c) => {
    const cliente = firstName(c.name);
    const message = business.idleSlotTemplate
      ? renderTemplate(business.idleSlotTemplate, {
          cliente,
          negocio: business.name,
          assinatura: business.signature ?? "",
        })
      : `Oi ${cliente}! A ${business.name} ta com horarios livres amanha. ` +
        `Quer aproveitar pra dar aquela renovada? Me fala o melhor horario que eu encaixo 😉${greetingSuffix(business)}`;
    return {
      kind: "IDLE_SLOT" as const,
      contactId: c.id,
      contactName: c.name,
      phone: c.phone,
      message,
    };
  });
}

// Junta os candidatos de todas as automacoes ligadas (para a previa na UI).
export async function getAutomationCandidates(business: Business): Promise<AutomationCandidate[]> {
  const [w, n, i] = await Promise.all([
    winBackCandidates(business),
    noShowCandidates(business),
    idleSlotCandidates(business),
  ]);
  return [...w, ...n, ...i];
}

// Marca o candidato como processado para nao reenviar.
async function markSent(c: AutomationCandidate) {
  if (c.conversationId) {
    await prisma.conversation.update({
      where: { id: c.conversationId },
      data: { winBackSentAt: new Date() },
    });
  }
  if (c.appointmentId) {
    await prisma.appointment.update({
      where: { id: c.appointmentId },
      data: { reminderSentAt: new Date() },
    });
  }
}

// Executa as automacoes: envia (ou loga, no modo demo) e marca como enviado.
export async function runAutomationsForBusiness(business: Business): Promise<{ sent: number }> {
  const candidates = await getAutomationCandidates(business);
  let sent = 0;
  for (const c of candidates) {
    try {
      await sendWhatsappMessage(business, c.phone, c.message);
      await markSent(c);
      sent += 1;
    } catch (error) {
      console.error(`[automations] falha ao enviar (${c.kind}) para ${c.phone}:`, error);
    }
  }
  return { sent };
}

export async function runAutomationsAllBusinesses(): Promise<{ businesses: number; sent: number }> {
  const businesses = await prisma.business.findMany({
    where: { billingStatus: { in: ["TRIAL", "ATIVO"] } },
  });
  let totalSent = 0;
  for (const b of businesses) {
    const { sent } = await runAutomationsForBusiness(b);
    totalSent += sent;
  }
  return { businesses: businesses.length, sent: totalSent };
}
