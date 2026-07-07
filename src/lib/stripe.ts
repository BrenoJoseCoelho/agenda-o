import Stripe from "stripe";
import type { Plan } from "@/generated/prisma/client";

// Null quando nao configurado, para o app rodar sem chaves (o Plano cai no
// modo manual de teste). Preenchido em producao com STRIPE_SECRET_KEY.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export function stripeConfigured(): boolean {
  return Boolean(stripe);
}

// Cada plano aponta para um Price recorrente criado no painel da Stripe.
export function priceIdFor(plan: Plan): string | undefined {
  const map: Record<Plan, string | undefined> = {
    ESSENCIAL: process.env.STRIPE_PRICE_ESSENCIAL,
    PROFISSIONAL: process.env.STRIPE_PRICE_PROFISSIONAL,
    ILIMITADO: process.env.STRIPE_PRICE_ILIMITADO,
  };
  return map[plan];
}

// Descobre o plano a partir do Price recebido no webhook (mapa inverso).
export function planForPriceId(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ESSENCIAL) return "ESSENCIAL";
  if (priceId === process.env.STRIPE_PRICE_PROFISSIONAL) return "PROFISSIONAL";
  if (priceId === process.env.STRIPE_PRICE_ILIMITADO) return "ILIMITADO";
  return null;
}
