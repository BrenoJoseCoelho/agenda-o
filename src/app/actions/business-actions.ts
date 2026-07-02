"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness, requireSession } from "@/lib/access";

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
  redirect(`/negocios/${business.id}/cerebro`);
}

export async function updateBrainAction(businessId: string, formData: FormData) {
  const { business } = await requireBusiness(businessId);

  await prisma.business.update({
    where: { id: business.id },
    data: {
      name: String(formData.get("name") || business.name),
      aiName: String(formData.get("aiName") || business.aiName),
      tone: String(formData.get("tone") || business.tone),
      openingHours: String(formData.get("openingHours") || business.openingHours),
      rules: String(formData.get("rules") || business.rules),
    },
  });

  revalidatePath(`/negocios/${business.id}/cerebro`);
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

  revalidatePath(`/negocios/${business.id}/cerebro`);
}

export async function removeServiceAction(businessId: string, serviceId: string) {
  const { business } = await requireBusiness(businessId);
  await prisma.service.delete({ where: { id: serviceId } });
  revalidatePath(`/negocios/${business.id}/cerebro`);
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

  revalidatePath(`/negocios/${business.id}/cerebro`);
}
