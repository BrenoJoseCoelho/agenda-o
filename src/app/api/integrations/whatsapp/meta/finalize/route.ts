import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessApi } from "@/lib/api-access";
import { finalizeMetaSignup } from "@/lib/whatsapp/meta-onboarding";

// Chamado pelo componente do navegador ao concluir o popup do Embedded Signup.
// Recebe o code + ids, troca por token, prepara o numero e salva no negocio.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const code = typeof body?.code === "string" ? body.code : "";
  const phoneNumberId = typeof body?.phoneNumberId === "string" ? body.phoneNumberId : "";
  const wabaId = typeof body?.wabaId === "string" ? body.wabaId : "";

  const access = await requireBusinessApi(businessId);
  if ("error" in access) return access.error;

  if (!code || !phoneNumberId || !wabaId) {
    return NextResponse.json({ error: "Dados incompletos do onboarding." }, { status: 400 });
  }

  const result = await finalizeMetaSignup({ code, phoneNumberId, wabaId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await prisma.business.update({
    where: { id: access.business.id },
    data: {
      whatsappProvider: "META",
      whatsappPhoneNumberId: result.phoneNumberId,
      whatsappAccessToken: result.accessToken,
    },
  });

  return NextResponse.json({ ok: true });
}
