"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/access";
import { createDirectReservation, syncUnitFeeds } from "@/lib/lodging";
import { parseDateOnly } from "@/lib/ical";
import type { BusinessType } from "@/generated/prisma/client";

async function ownUnit(businessId: string, unitId: string) {
  const { business } = await requireBusiness(businessId);
  const unit = await prisma.rentalUnit.findUnique({ where: { id: unitId } });
  if (!unit || unit.businessId !== business.id) return null;
  return { business, unit };
}

export async function setBusinessTypeAction(businessId: string, type: BusinessType) {
  const { business } = await requireBusiness(businessId);
  await prisma.business.update({ where: { id: business.id }, data: { businessType: type } });
  revalidatePath(`/negocios/${business.slug}/hospedagem`);
  revalidatePath(`/negocios/${business.slug}/cerebro`);
}

export async function createUnitAction(businessId: string, formData: FormData) {
  const { business } = await requireBusiness(businessId);
  const name = String(formData.get("name") || "").trim();
  const price = parseFloat(String(formData.get("nightly") || "0").replace(",", "."));
  const capacity = parseInt(String(formData.get("capacity") || "2"), 10);
  if (!name) return;
  await prisma.rentalUnit.create({
    data: {
      businessId: business.id,
      name,
      nightlyPriceCents: Number.isNaN(price) ? 0 : Math.round(price * 100),
      capacity: Number.isNaN(capacity) ? 2 : capacity,
    },
  });
  revalidatePath(`/negocios/${business.slug}/hospedagem`);
}

export async function removeUnitAction(businessId: string, unitId: string) {
  const owned = await ownUnit(businessId, unitId);
  if (!owned) return;
  await prisma.rentalUnit.delete({ where: { id: unitId } });
  revalidatePath(`/negocios/${owned.business.slug}/hospedagem`);
}

export async function addReservationAction(businessId: string, formData: FormData) {
  const { business } = await requireBusiness(businessId);
  const unitId = String(formData.get("unitId") || "");
  const owned = await ownUnit(businessId, unitId);
  const back = `/negocios/${business.slug}/hospedagem`;
  if (!owned) redirect(`${back}?error=unidade_invalida`);

  const checkIn = parseDateOnly(String(formData.get("checkIn") || ""));
  const checkOut = parseDateOnly(String(formData.get("checkOut") || ""));
  const guestName = String(formData.get("guestName") || "").trim() || undefined;
  if (!checkIn || !checkOut) redirect(`${back}?error=datas_invalidas`);

  const result = await createDirectReservation({ unitId, checkIn, checkOut, guestName });
  if (!result.ok) redirect(`${back}?error=datas_ocupadas`);
  revalidatePath(back);
  redirect(`${back}?ok=reserva_criada`);
}

export async function cancelReservationAction(businessId: string, reservationId: string) {
  const { business } = await requireBusiness(businessId);
  const r = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { unit: true } });
  if (!r || r.unit.businessId !== business.id) return;
  await prisma.reservation.update({ where: { id: reservationId }, data: { status: "CANCELADA" } });
  revalidatePath(`/negocios/${business.slug}/hospedagem`);
}

export async function addFeedAction(businessId: string, formData: FormData) {
  const unitId = String(formData.get("unitId") || "");
  const owned = await ownUnit(businessId, unitId);
  if (!owned) return;
  const label = String(formData.get("label") || "").trim() || "Airbnb";
  const url = String(formData.get("url") || "").trim();
  if (!url.startsWith("http")) return;
  await prisma.unitCalendarFeed.create({ data: { unitId, label, url } });
  revalidatePath(`/negocios/${owned.business.slug}/hospedagem`);
}

export async function removeFeedAction(businessId: string, feedId: string) {
  const { business } = await requireBusiness(businessId);
  const feed = await prisma.unitCalendarFeed.findUnique({ where: { id: feedId }, include: { unit: true } });
  if (!feed || feed.unit.businessId !== business.id) return;
  await prisma.unitCalendarFeed.delete({ where: { id: feedId } });
  revalidatePath(`/negocios/${business.slug}/hospedagem`);
}

export async function syncNowAction(businessId: string) {
  const { business } = await requireBusiness(businessId);
  const units = await prisma.rentalUnit.findMany({
    where: { businessId: business.id },
    include: { feeds: true },
  });
  for (const unit of units) await syncUnitFeeds(unit);
  revalidatePath(`/negocios/${business.slug}/hospedagem`);
}
