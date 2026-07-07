import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, planForPriceId } from "@/lib/stripe";
import type { BillingStatus } from "@/generated/prisma/client";

// Sincroniza a cobranca da Stripe com o billingStatus/plano do negocio.
// Configure este endpoint no painel da Stripe e coloque o segredo em
// STRIPE_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ ok: true, skipped: "stripe_disabled" });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Ajusta o negocio identificado pelo customer id (ou metadata).
  async function apply(
    customerId: string | null,
    data: { billingStatus?: BillingStatus; plan?: "ESSENCIAL" | "PROFISSIONAL" | "ILIMITADO"; stripeSubscriptionId?: string | null },
    businessIdHint?: string
  ) {
    const business = businessIdHint
      ? await prisma.business.findUnique({ where: { id: businessIdHint } })
      : customerId
        ? await prisma.business.findUnique({ where: { stripeCustomerId: customerId } })
        : null;
    if (!business) return;
    await prisma.business.update({ where: { id: business.id }, data });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      await apply(
        typeof s.customer === "string" ? s.customer : null,
        {
          billingStatus: "ATIVO",
          plan: (s.metadata?.plan as "ESSENCIAL" | "PROFISSIONAL" | "ILIMITADO") || undefined,
          stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : null,
        },
        s.metadata?.businessId || undefined
      );
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object;
      const priceId = sub.items.data[0]?.price?.id;
      const plan = planForPriceId(priceId);
      const active = sub.status === "active" || sub.status === "trialing";
      await apply(
        typeof sub.customer === "string" ? sub.customer : null,
        {
          billingStatus: active ? "ATIVO" : "PAUSADO",
          plan: plan || undefined,
          stripeSubscriptionId: sub.id,
        },
        sub.metadata?.businessId || undefined
      );
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await apply(
        typeof sub.customer === "string" ? sub.customer : null,
        { billingStatus: "PAUSADO", stripeSubscriptionId: null },
        sub.metadata?.businessId || undefined
      );
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object;
      await apply(typeof inv.customer === "string" ? inv.customer : null, {
        billingStatus: "PAUSADO",
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
