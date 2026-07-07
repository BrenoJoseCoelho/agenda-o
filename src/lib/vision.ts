import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type ExtractedService = { name: string; priceCents: number; durationMinutes: number };
export type ExtractResult =
  | { ok: true; services: ExtractedService[] }
  | { ok: false; error: string };

// Vision precisa de um modelo com imagem; onboarding é raro, então usamos um bom.
const VISION_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const extractTool: Anthropic.Tool = {
  name: "registrar_servicos",
  description: "Registra a lista de servicos lida da tabela de precos / cardapio.",
  input_schema: {
    type: "object",
    properties: {
      servicos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome do servico." },
            preco_reais: { type: "number", description: "Preco em reais (numero, ex: 45.9)." },
            duracao_minutos: {
              type: "number",
              description: "Duracao estimada em minutos. Se nao houver, estime pelo tipo de servico.",
            },
          },
          required: ["nome", "preco_reais", "duracao_minutos"],
        },
      },
    },
    required: ["servicos"],
  },
};

// Reads a photo of a price list / menu and returns structured services.
export async function extractServicesFromImage(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ExtractResult> {
  if (!anthropic) {
    return { ok: false, error: "IA nao configurada (defina ANTHROPIC_API_KEY para importar por foto)." };
  }

  try {
    const msg = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 2048,
      tools: [extractTool],
      tool_choice: { type: "tool", name: "registrar_servicos" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text:
                "Esta imagem e a tabela de precos de um negocio (barbearia, salao, clinica, etc). " +
                "Extraia TODOS os servicos com nome e preco. Se a duracao nao aparecer, estime pelo " +
                "tipo de servico. Ignore textos que nao sejam servico/preco. Chame a ferramenta.",
            },
          ],
        },
      ],
    });

    const toolUse = msg.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { ok: false, error: "Nao consegui ler servicos nessa imagem. Tente uma foto mais nitida." };
    }

    const raw = (toolUse.input as { servicos?: unknown[] }).servicos ?? [];
    const services: ExtractedService[] = [];
    for (const item of raw) {
      const s = item as { nome?: unknown; preco_reais?: unknown; duracao_minutos?: unknown };
      const name = typeof s.nome === "string" ? s.nome.trim() : "";
      const price = typeof s.preco_reais === "number" ? s.preco_reais : NaN;
      const dur = typeof s.duracao_minutos === "number" ? Math.round(s.duracao_minutos) : 30;
      if (!name || Number.isNaN(price)) continue;
      services.push({
        name,
        priceCents: Math.round(price * 100),
        durationMinutes: dur > 0 ? dur : 30,
      });
    }

    if (services.length === 0) {
      return { ok: false, error: "Nenhum servico reconhecido na imagem." };
    }
    return { ok: true, services };
  } catch {
    return { ok: false, error: "Falha ao processar a imagem. Tente novamente." };
  }
}
