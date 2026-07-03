import Anthropic from "@anthropic-ai/sdk";
import type { Business, Service } from "@/generated/prisma/client";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type HistoryItem = { sender: "CLIENTE" | "IA" | "HUMANO"; content: string };

// What the AI knows about the person on the other side (client memory feature).
export type ContactContext = { name: string; memory?: string | null; pastSummary?: string };

export type AiResult = {
  reply: string;
  appointment?: { serviceId: string; scheduledAt: Date };
  memory?: string; // uma preferencia que a IA quer guardar sobre o cliente
};

// The AI model scales with the customer's plan, so quality rises with price and
// margin stays protected per tier. ANTHROPIC_MODEL (if set) overrides everything.
const PLAN_MODEL: Record<string, string> = {
  ESSENCIAL: "claude-haiku-4-5",
  PROFISSIONAL: "claude-sonnet-5",
  ILIMITADO: "claude-opus-4-8",
};

function modelForPlan(plan: string): string {
  return process.env.ANTHROPIC_MODEL || PLAN_MODEL[plan] || "claude-sonnet-5";
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildSystemPrompt(business: Business, services: Service[], contact?: ContactContext) {
  const serviceLines =
    services
      .map((s) => `- ${s.name}: ${formatPrice(s.priceCents)} (${s.durationMinutes} min)`)
      .join("\n") || "Nenhum servico cadastrado ainda.";

  const contactBlock =
    contact && (contact.memory || contact.pastSummary)
      ? `\n# QUEM E ESTE CLIENTE (use com naturalidade, sem soar invasiva)\nNome: ${contact.name}\n${
          contact.memory ? `O que voce ja sabe dele: ${contact.memory}\n` : ""
        }${contact.pastSummary ? `Historico: ${contact.pastSummary}\n` : ""}`
      : "";

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formalityText: Record<string, string> = {
    INFORMAL: "Fale de forma bem informal e proxima, como um amigo. Pode usar giria leve.",
    NEUTRO: "Fale de forma natural e cordial, nem formal demais nem gíria.",
    FORMAL: "Fale de forma formal e respeitosa, tratando o cliente por 'senhor(a)'.",
  };
  const emojiText: Record<string, string> = {
    NENHUM: "Nao use emojis.",
    POUCO: "Use no maximo 1 emoji quando fizer sentido.",
    BASTANTE: "Use emojis a vontade para deixar a conversa animada.",
  };

  const personality = [
    `Tom de voz: ${business.tone}`,
    formalityText[business.formality] ?? formalityText.NEUTRO,
    emojiText[business.emojiLevel] ?? emojiText.POUCO,
    business.signature ? `Assinatura/bordao que voce costuma usar: "${business.signature}".` : "",
    business.avoid ? `NUNCA diga o seguinte: ${business.avoid}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const examplesBlock = business.examples
    ? `\nESTES SAO EXEMPLOS DO SEU JEITO DE FALAR (imite o estilo, o ritmo e as palavras — nao copie ao pe da letra):\n${business.examples}\n`
    : "";

  return `Voce e ${business.aiName}, a pessoa que atende o WhatsApp da "${business.name}". Voce e uma pessoa de verdade atendendo, nao um sistema.

# COMO VOCE FALA (o mais importante)
${personality}
- Escreva como gente escreve no WhatsApp: mensagens curtas e naturais, no maximo 1 a 3 frases. Nada de textao nem de linguagem de empresa ("Prezado", "Como posso auxilia-lo", "Fico a disposicao").
- Espelhe o cliente: se ele fala informal e com giria, acompanhe; se e mais seco, seja direta. Acompanhe a energia dele.
- Faca UMA pergunta de cada vez. Nunca despeje varias perguntas juntas nem pareca um formulario.
- Entenda erros de digitacao, abreviacoes e giria naturalmente, sem corrigir o cliente.
- Seja prestativa e simpatica, mas sem ser insistente ou vendedora chata. Ajude, nao empurre.
${examplesBlock}
# REGRA DE OURO: NUNCA se revele como IA
Voce NUNCA diz que e inteligencia artificial, robo, bot, assistente virtual, sistema ou programa. Se perguntarem "voce e um robo?" ou "isso e automatico?", desconverse com leveza e siga ajudando ("kkk imagina, aqui e a ${business.aiName} — bora resolver seu horario?"). Jamais quebre esse personagem.

# O QUE VOCE SABE
Horario de funcionamento: ${business.openingHours}
Servicos e precos:
${serviceLines}

Regras do negocio (siga a risca): ${business.rules}
${contactBlock}${
    business.clientMemoryEnabled
      ? '\n# MEMORIA\nSe o cliente revelar uma preferencia util e duradoura (ex: "sempre faco corte e barba", "so posso sabado"), chame a ferramenta "salvar_memoria" para lembrar nas proximas conversas. Use o que voce ja sabe dele acima para deixar o atendimento pessoal, sem parecer que esta lendo uma ficha.\n'
      : ""
  }

# HONESTIDADE
Nunca invente servico, preco, horario ou promocao que nao esteja na lista acima. Se o cliente pedir algo que voce nao tem certeza, diga que vai confirmar com a equipe e pede um instantinho — nunca chute.

# SEU OBJETIVO
Tirar a duvida do cliente e conduzi-lo com naturalidade ate marcar um dos servicos. Quando ele deixar claro o servico, o dia e o horario, chame a ferramenta "agendar_horario" com os dados exatos e confirme com simpatia depois.

# AUDIO
Se a mensagem veio de um audio transcrito e ficou ambigua, confirme rapidinho o que voce entendeu antes de agir ("so confirmando, voce quer corte e barba amanha de manha, e isso?").

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

const memoryTool: Anthropic.Tool = {
  name: "salvar_memoria",
  description:
    "Guarda uma preferencia ou observacao util e duradoura sobre ESTE cliente (ex: sempre faz corte + barba, prefere sabados de manha, gosta de conversar pouco). Use quando o cliente revelar algo que vale lembrar nas proximas conversas. Nao guarde dados sensiveis.",
  input_schema: {
    type: "object",
    properties: {
      observacao: {
        type: "string",
        description: "A preferencia/observacao a lembrar, curta e objetiva.",
      },
    },
    required: ["observacao"],
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
  contact?: ContactContext;
}): Promise<AiResult> {
  const { business, services, history, contact } = params;

  if (!anthropic) {
    return heuristicReply(business, services, history);
  }

  const memoryOn = business.clientMemoryEnabled;
  const system = buildSystemPrompt(business, services, memoryOn ? contact : undefined);
  const model = modelForPlan(business.plan);
  const tools = memoryOn ? [bookingTool, memoryTool] : [bookingTool];
  const baseMessages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.sender === "CLIENTE" ? "user" : "assistant",
    content: m.content,
  }));

  const first = await anthropic.messages.create({
    model,
    max_tokens: 500,
    system,
    tools,
    messages: baseMessages,
  });

  const toolUses = first.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

  const textOf = (msg: Anthropic.Message) =>
    msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

  if (toolUses.length === 0) {
    return { reply: textOf(first) || "Desculpa, pode repetir?" };
  }

  // Execute every tool the model asked for and collect a result for each.
  let appointment: AiResult["appointment"];
  let memory: string | undefined;
  let booked = false;
  const toolResults: Anthropic.ToolResultBlockParam[] = [];

  for (const tu of toolUses) {
    if (tu.name === "agendar_horario") {
      const input = tu.input as { servico: string; data_hora_iso: string };
      const service = matchService(services, input.servico);
      const scheduledAt = new Date(input.data_hora_iso);
      const valid = Boolean(service) && !Number.isNaN(scheduledAt.getTime());
      booked = valid;
      appointment = valid ? { serviceId: service!.id, scheduledAt } : undefined;
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: valid
          ? `Agendamento confirmado: ${service!.name} em ${scheduledAt.toLocaleString("pt-BR")}.`
          : "Nao foi possivel confirmar: servico ou horario invalido. Peça mais detalhes ao cliente.",
      });
    } else if (tu.name === "salvar_memoria") {
      const input = tu.input as { observacao: string };
      memory = String(input.observacao || "").trim() || undefined;
      toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: "Anotado." });
    } else {
      toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: "ok" });
    }
  }

  const second = await anthropic.messages.create({
    model,
    max_tokens: 300,
    system,
    tools,
    messages: [
      ...baseMessages,
      { role: "assistant", content: first.content },
      { role: "user", content: toolResults },
    ],
  });

  const reply =
    textOf(second) ||
    (booked ? "Perfeito, agendado! Te espero." : "Pode confirmar de novo o servico e o horario?");

  return { reply, appointment, memory };
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
