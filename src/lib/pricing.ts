import type { Plan } from "@/generated/prisma/client";

// Preço mensal de cada plano (em centavos). Mantido aqui para o painel master
// e a página de Plano usarem a mesma fonte.
export const PLAN_PRICE_CENTS: Record<Plan, number> = {
  ESSENCIAL: 14700, // R$ 147
  PROFISSIONAL: 24700, // R$ 247
  ILIMITADO: 44700, // R$ 447
};

export const PLAN_LABEL: Record<Plan, string> = {
  ESSENCIAL: "Essencial",
  PROFISSIONAL: "Profissional",
  ILIMITADO: "Ilimitado",
};

export const PLAN_ORDER: Plan[] = ["ESSENCIAL", "PROFISSIONAL", "ILIMITADO"];

// ---- Estimativas de custo (AJUSTE conforme suas faturas reais) ----
// São premissas para o painel master calcular gasto/lucro; não são cobranças.
export const COST_ASSUMPTIONS = {
  // Infra fixa por mês: Vercel + banco (Neon) + base do BSP (360dialog).
  fixedMonthlyCents: 60000, // ~R$ 600/mes
  // Custo estimado de IA por conversa, por plano (cada plano usa um modelo:
  // Essencial=Haiku barato, Profissional=Sonnet 5, Ilimitado=Opus 4.8).
  aiPerConversationCents: {
    ESSENCIAL: 5, // ~R$ 0,05
    PROFISSIONAL: 25, // ~R$ 0,25
    ILIMITADO: 120, // ~R$ 1,20
  } as Record<Plan, number>,
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
