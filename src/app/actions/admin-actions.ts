"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/access";
import type { BillingStatus, Plan } from "@/generated/prisma/client";

const VALID_STATUS: BillingStatus[] = ["TRIAL", "ATIVO", "PAUSADO"];
const VALID_PLAN: Plan[] = ["ESSENCIAL", "PROFISSIONAL", "ILIMITADO"];

// Muda o status de cobranca de um cliente (ativar / pausar / voltar pra teste).
export async function setBillingStatusAction(businessId: string, status: BillingStatus) {
  await requireSuperAdmin();
  if (!VALID_STATUS.includes(status)) return;
  await prisma.business.update({ where: { id: businessId }, data: { billingStatus: status } });
  revalidatePath("/admin");
}

// Troca o plano de um cliente pelo painel master.
export async function setPlanAction(businessId: string, plan: Plan) {
  await requireSuperAdmin();
  if (!VALID_PLAN.includes(plan)) return;
  await prisma.business.update({ where: { id: businessId }, data: { plan } });
  revalidatePath("/admin");
}
