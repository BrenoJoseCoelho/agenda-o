"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/access";
import type { CalendarProvider } from "@/generated/prisma/client";

export async function disconnectCalendarAction(businessId: string, provider: CalendarProvider) {
  const { business } = await requireBusiness(businessId);

  const connection = await prisma.calendarConnection.findUnique({
    where: { businessId_provider: { businessId: business.id, provider } },
  });
  if (!connection) return;

  // Best-effort: revoke nothing remotely, just drop our stored tokens.
  await prisma.calendarConnection.delete({ where: { id: connection.id } });
  revalidatePath(`/negocios/${business.slug}/integracoes`);
}

export async function generateIcsTokenAction(businessId: string) {
  const { business } = await requireBusiness(businessId);
  const token = randomBytes(24).toString("hex");
  await prisma.business.update({ where: { id: business.id }, data: { icsToken: token } });
  revalidatePath(`/negocios/${business.slug}/integracoes`);
}

export async function revokeIcsTokenAction(businessId: string) {
  const { business } = await requireBusiness(businessId);
  await prisma.business.update({ where: { id: business.id }, data: { icsToken: null } });
  revalidatePath(`/negocios/${business.slug}/integracoes`);
}

export async function disconnectWhatsappAction(businessId: string) {
  const { business } = await requireBusiness(businessId);
  await prisma.business.update({
    where: { id: business.id },
    data: {
      whatsappProvider: "META",
      whatsappApiKey: null,
      whatsappChannelId: null,
      whatsappPhoneNumberId: null,
      whatsappAccessToken: null,
    },
  });
  revalidatePath(`/negocios/${business.slug}/integracoes`);
}
