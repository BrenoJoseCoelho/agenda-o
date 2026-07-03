import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateChannelApiKey, setChannelWebhook } from "@/lib/whatsapp/onboarding";

// 360dialog redirects here after the customer finishes onboarding, with
// ?client=<id>&channels=<id>&state=<businessId>. We turn the channel into a
// stored D360-API-KEY and connect the number — no tokens pasted by the customer.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("state") ?? "";
  const channelsParam = url.searchParams.get("channels") ?? "";
  const channelId = channelsParam.split(",")[0]?.trim();

  const back = (suffix: string) =>
    NextResponse.redirect(new URL(`/negocios/${businessId}/integracoes${suffix}`, request.url));

  if (!businessId || !channelId) {
    return back("?error=conexao_cancelada");
  }

  // Ownership check before storing anything.
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", request.url));
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.organizationId !== session.user.organizationId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const apiKey = await generateChannelApiKey(channelId);
  if (!apiKey) {
    return back("?error=falha_ao_conectar");
  }

  await prisma.business.update({
    where: { id: businessId },
    data: {
      whatsappProvider: "D360",
      whatsappApiKey: apiKey,
      whatsappChannelId: channelId,
    },
  });

  await setChannelWebhook(apiKey);

  return back("?ok=whatsapp_conectado");
}
