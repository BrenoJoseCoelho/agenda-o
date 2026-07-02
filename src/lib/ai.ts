import Anthropic from "@anthropic-ai/sdk";
import type { Business, Service } from "@/generated/prisma/client";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type HistoryItem = { sender: "CLIENTE" | "IA" | "HUMANO"; content: string };

export type AiResult = {
  reply: string;
  appointment?: { serviceId: string; scheduledAt: Date };
};

// Default to Opus 4.8 (most capable). Override with ANTHROPIC_MODEL for a
// cheaper/faster tier on high volume, e.g. "claude-sonnet-5" or "claude-haiku-4-5".
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildSystemPrompt(business: Business, services: Service[]) {
  const serviceLines =
    services
      .map((s) => `- ${s.name}: ${formatPrice(s.priceCents)} (${s.durationMinutes} min)`)
      .join("\n") || "Nenhum servico cadastrado ainda.";

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `Voce e ${business.aiName}, atendente de IA no WhatsApp de "${business.name}".
Tom de voz: ${business.tone}
Horario de funcionamento: ${business.openingHours}
Regras: ${business.rules}

Servicos e precos disponiveis:
${serviceLines}

Seu objetivo e tirar duvidas e conduzir o cliente ate o agendamento de um dos servicos acima.
Quando o cliente confirmar servico, dia e horario, chame a ferramenta "agendar_horario" com os dados exatos.
Nunca invente servicos, precos ou horarios fora do que foi informado. Responda como uma mensagem real de WhatsApp: curta, direta, no maximo 2-3 frases.
Hoje e ${today}.`;
}

const bookingTool: Anthropic.Tool = {
  name: "agendar_horario",
  description:
    "Confirma um agendamento depois que o cliente escolheu servico, dia e horario com clareza.",
  input_schema: {
    type: "object",
    properties: {
      servico: { type: "string", description: "Nome exato do servico, igual a lista fornecida." },
      data_hora_iso: {
        type: "string",
        description: "Data e hora do agendamento em ISO 8601 com timezone, ex: 2026-07-03T14:00:00-03:00",
      },
    },
    required: ["servico", "data_hora_iso"],
  },
};

function matchService(services: Service[], name: string) {
  const lower = name.toLowerCase().trim();
  return (
    services.find((s) => s.name.toLowerCase() === lower) ??
    services.find((s) => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()))
  );
}

export async function generateAiReply(params: {
  business: Business;
  services: Service[];
  history: HistoryItem[];
}): Promise<AiResult> {
  const { business, services, history } = params;

  if (!anthropic) {
    return heuristicReply(business, services, history);
  }

  const system = buildSystemPrompt(business, services);
  const baseMessages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.sender === "CLIENTE" ? "user" : "assistant",
    content: m.content,
  }));

  const first = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system,
    tools: [bookingTool],
    messages: baseMessages,
  });

  const toolUse = first.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "agendar_horario"
  );

  if (!toolUse) {
    const reply =
      first.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim() || "Desculpa, pode repetir?";
    return { reply };
  }

  const input = toolUse.input as { servico: string; data_hora_iso: string };
  const service = matchService(services, input.servico);
  const scheduledAt = new Date(input.data_hora_iso);
  const valid = Boolean(service) && !Number.isNaN(scheduledAt.getTime());

  const toolResultContent = valid
    ? `Agendamento confirmado: ${service!.name} em ${scheduledAt.toLocaleString("pt-BR")}.`
    : "Nao foi possivel confirmar: servico ou horario invalido. Peça mais detalhes ao cliente.";

  const second = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system,
    tools: [bookingTool],
    messages: [
      ...baseMessages,
      { role: "assistant", content: first.content },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: toolResultContent }],
      },
    ],
  });

  const reply =
    second.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim() || (valid ? "Perfeito, agendado! Te espero." : "Pode confirmar de novo o servico e o horario?");

  return {
    reply,
    appointment: valid ? { serviceId: service!.id, scheduledAt } : undefined,
  };
}

// Several services can share a first word (e.g. "Corte masculino" / "Corte + Barba"), so a
// bare "corte" should resolve to the simpler/shorter one unless the full name was said.
function findMentionedService(services: Service[], text: string): Service | undefined {
  const candidates = services.filter((s) => {
    const firstWord = s.name.toLowerCase().split(" ")[0];
    return new RegExp(`\\b${firstWord}\\b`).test(text);
  });
  if (candidates.length === 0) return undefined;
  // If one or more full names appear in the text, prefer the LONGEST match
  // ("corte + barba" beats a bare "barba" that is a substring of it).
  const fullMatches = candidates
    .filter((s) => text.includes(s.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length);
  if (fullMatches.length > 0) return fullMatches[0];
  // Otherwise only a first word matched (e.g. bare "corte"): pick the simplest service.
  const wordCount = (name: string) => name.trim().split(/\s+/).filter(Boolean).length;
  return [...candidates].sort((a, b) => wordCount(a.name) - wordCount(b.name))[0];
}

// Fallback used when no ANTHROPIC_API_KEY is configured, so the product is demoable
// without external credentials. Add ANTHROPIC_API_KEY in .env to switch to the real model.
function heuristicReply(business: Business, services: Service[], history: HistoryItem[]): AiResult {
  const lastMsg = history[history.length - 1]?.content?.toLowerCase() ?? "";
  const allText = history.map((h) => h.content.toLowerCase()).join(" \n ");

  if (/hor[aá]rio|que horas|aberto|funciona/.test(lastMsg)) {
    return { reply: `A gente atende ${business.openingHours}. Quer marcar um horario?` };
  }

  const mentioned = findMentionedService(services, lastMsg);
  if (mentioned && !/marcar|agendar|quero|pode ser|fechado|confirma/.test(lastMsg)) {
    return {
      reply: `${mentioned.name} sai por ${formatPrice(mentioned.priceCents)} e leva uns ${mentioned.durationMinutes} minutos. Quer que eu ja deixe marcado?`,
    };
  }

  const priorServiceMention = findMentionedService(services, allText);

  if (/marcar|agendar|fechado|confirma|pode ser|quero sim/.test(lastMsg) && priorServiceMention) {
    const scheduledAt = guessDate(lastMsg);
    return {
      reply: `Show, ficou marcado ${priorServiceMention.name} para ${scheduledAt.toLocaleString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}. Te espero!`,
      appointment: { serviceId: priorServiceMention.id, scheduledAt },
    };
  }

  if (/marcar|agendar|quero/.test(lastMsg)) {
    const list = services.map((s) => s.name).join(", ") || "nossos servicos";
    return { reply: `Claro! Qual servico voce quer: ${list}?` };
  }

  // First contact gets a short introduction; after that, just ask what they need.
  const isFirstCustomerMessage = history.filter((h) => h.sender === "CLIENTE").length <= 1;
  if (isFirstCustomerMessage) {
    return {
      reply: `Oi! Aqui e a ${business.aiName}, da ${business.name}. Como posso te ajudar?`,
    };
  }
  return { reply: "Como posso te ajudar?" };
}

function guessDate(text: string): Date {
  const now = new Date();
  const d = new Date(now);
  if (/amanh[ãa]/.test(text)) d.setDate(d.getDate() + 1);

  const hourMatch = text.match(/(\d{1,2})[:h](\d{2})?/);
  let hour = 10;
  let minute = 0;
  if (hourMatch) {
    hour = parseInt(hourMatch[1], 10);
    minute = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
  }
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}
