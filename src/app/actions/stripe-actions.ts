"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/access";
import { appUrl } from "@/lib/env";
import { stripe, priceIdFor } from "@/lib/stripe";
import type { Plan } from "@/generated/prisma/client";

// Garante um Stripe Customer para o negocio (cria e salva na primeira vez).
async function ensureCustomer(businessId: string, name: string, existing: string | null) {
  if (existing) return existing;
  const customer = await stripe!.customers.create({
    name,
    metadata: { businessId },
  });
  await prisma.business.update({
    where: { id: businessId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

// Inicia a assinatura de um plano via Stripe Checkout.
export async function createCheckoutAction(businessId: string, plan: Plan) {
  const { business } = await requireBusiness(businessId);
  const base = `${appUrl()}/negocios/${business.slug}/plano`;

  const priceId = priceIdFor(plan);
  if (!stripe || !priceId) {
    redirect(`${base}?error=pagamento_indisponivel`);
  }

  const customerId = await ensureCustomer(business.id, business.name, business.stripeCustomerId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}?ok=assinatura_ativada`,
    cancel_url: `${base}?error=checkout_cancelado`,
    metadata: { businessId: business.id, plan },
    subscription_data: { metadata: { businessId: business.id } },
  });

  if (!session.url) redirect(`${base}?error=pagamento_indisponivel`);
  redirect(session.url);
}

// Abre o portal de cobranca da Stripe (trocar cartao, cancelar, ver faturas).
export async function createPortalAction(businessId: string) {
  const { business } = await requireBusiness(businessId);
  const base = `${appUrl()}/negocios/${business.slug}/plano`;

  if (!stripe || !business.stripeCustomerId) {
    redirect(`${base}?error=sem_assinatura`);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripeCustomerId,
    return_url: base,
  });
  redirect(session.url);
}
