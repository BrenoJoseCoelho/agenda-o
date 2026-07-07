"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness, requireSession } from "@/lib/access";
import { runAutomationsForBusiness } from "@/lib/automations";

function slugify(name: string) {
  const stripped = name
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
  return stripped.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function createBusinessAction(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/organizacao?error=Informe o nome do cliente");

  const base = slugify(name) || "negocio";
  let slug = base;
  let attempt = 0;
  while (await prisma.business.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  const business = await prisma.business.create({
    data: { organizationId: session.user.organizationId, name, slug },
  });

  revalidatePath("/organizacao");
  redirect(`/negocios/${business.slug}/cerebro`);
}

export async function updateBrainAction(businessId: string, formData: FormData) {
  const { business } = await requireBusiness(businessId);

  const formality = String(formData.get("formality") || business.formality);
  const emojiLevel = String(formData.get("emojiLevel") || business.emojiLevel);
  const validFormality = ["INFORMAL", "NEUTRO", "FORMAL"].includes(formality)
    ? (formality as "INFORMAL" | "NEUTRO" | "FORMAL")
    : business.formality;
  const validEmoji = ["NENHUM", "POUCO", "BASTANTE"].includes(emojiLevel)
    ? (emojiLevel as "NENHUM" | "POUCO" | "BASTANTE")
    : business.emojiLevel;

  await prisma.business.update({
    where: { id: business.id },
    data: {
      name: String(formData.get("name") || business.name),
      aiName: String(formData.get("aiName") || business.aiName),
      tone: String(formData.get("tone") || business.tone),
      openingHours: String(formData.get("openingHours") || business.openingHours),
      rules: String(formData.get("rules") || business.rules),
      formality: validFormality,
      emojiLevel: validEmoji,
      signature: String(formData.get("signature") || "").trim() || null,
      examples: String(formData.get("examples") || "").trim() || null,
      avoid: String(formData.get("avoid") || "").trim() || null,
    },
  });

  revalidatePath(`/negocios/${business.slug}/cerebro`);
}

export async function addServiceAction(businessId: string, formData: FormData) {
  const { business } = await requireBusiness(businessId);
  const name = String(formData.get("name") || "").trim();
  const priceReais = parseFloat(String(formData.get("price") || "0").replace(",", "."));
  const durationMinutes = parseInt(String(formData.get("duration") || "30"), 10);

  if (!name || Number.isNaN(priceReais)) {
    return;
  }

  await prisma.service.create({
    data: {
      businessId: business.id,
      name,
      priceCents: Math.round(priceReais * 100),
      durationMinutes: Number.isNaN(durationMinutes) ? 30 : durationMinutes,
    },
  });

  revalidatePath(`/negocios/${business.slug}/cerebro`);
}

export async function removeServiceAction(businessId: string, serviceId: string) {
  const { business } = await requireBusiness(businessId);
  await prisma.service.delete({ where: { id: serviceId } });
  revalidatePath(`/negocios/${business.slug}/cerebro`);
}

// Salva varios servicos de uma vez (usado pelo onboarding por foto, apos o
// dono revisar a lista extraida da imagem).
export async function bulkAddServicesAction(
  businessId: string,
  services: { name: string; priceCents: number; durationMinutes: number }[]
) {
  const { business } = await requireBusiness(businessId);
  const clean = services
    .filter((s) => s.name?.trim() && Number.isFinite(s.priceCents) && s.priceCents >= 0)
    .slice(0, 100)
    .map((s) => ({
      businessId: business.id,
      name: s.name.trim().slice(0, 120),
      priceCents: Math.round(s.priceCents),
      durationMinutes: Number.isFinite(s.durationMinutes) && s.durationMinutes > 0
        ? Math.round(s.durationMinutes)
        : 30,
    }));
  if (clean.length === 0) return;
  await prisma.service.createMany({ data: clean });
  revalidatePath(`/negocios/${business.slug}/cerebro`);
}

export async function updateAutomationsAction(businessId: string, formData: FormData) {
  const { business } = await requireBusiness(businessId);
  const on = (name: string) => formData.get(name) === "on";
  const days = parseInt(String(formData.get("winBackDays") || business.winBackDays), 10);

  const tpl = (name: string) => {
    const v = String(formData.get(name) || "").trim();
    return v || null;
  };

  await prisma.business.update({
    where: { id: business.id },
    data: {
      winBackEnabled: on("winBackEnabled"),
      noShowReminderEnabled: on("noShowReminderEnabled"),
      idleSlotEnabled: on("idleSlotEnabled"),
      clientMemoryEnabled: on("clientMemoryEnabled"),
      winBackDays: Number.isNaN(days) || days < 1 ? business.winBackDays : days,
      winBackTemplate: tpl("winBackTemplate"),
      noShowTemplate: tpl("noShowTemplate"),
      idleSlotTemplate: tpl("idleSlotTemplate"),
    },
  });

  revalidatePath(`/negocios/${business.slug}/automacoes`);
  revalidatePath(`/negocios/${business.slug}/cerebro`);
}

export async function runAutomationsNowAction(businessId: string) {
  const { business } = await requireBusiness(businessId);
  await runAutomationsForBusiness(business);
  revalidatePath(`/negocios/${business.slug}/automacoes`);
}

export async function updatePlanAction(businessId: string, plan: "ESSENCIAL" | "PROFISSIONAL" | "ILIMITADO") {
  const { business } = await requireBusiness(businessId);
  // Once Stripe is wired, this action becomes the success handler after checkout.
  await prisma.business.update({ where: { id: business.id }, data: { plan } });
  revalidatePath(`/negocios/${business.slug}/plano`);
}

export async function updateWhatsappAction(businessId: string, formData: FormData) {
  const { business } = await requireBusiness(businessId);

  await prisma.business.update({
    where: { id: business.id },
    data: {
      whatsappPhoneNumberId: String(formData.get("whatsappPhoneNumberId") || "").trim() || null,
      whatsappAccessToken: String(formData.get("whatsappAccessToken") || "").trim() || null,
    },
  });

  revalidatePath(`/negocios/${business.slug}/cerebro`);
}

export async function updateInstagramAction(businessId: string, formData: FormData) {
  const { business } = await requireBusiness(businessId);

  await prisma.business.update({
    where: { id: business.id },
    data: {
      instagramAccountId: String(formData.get("instagramAccountId") || "").trim() || null,
      instagramAccessToken: String(formData.get("instagramAccessToken") || "").trim() || null,
    },
  });

  revalidatePath(`/negocios/${business.slug}/integracoes`);
}
