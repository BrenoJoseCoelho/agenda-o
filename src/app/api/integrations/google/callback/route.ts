import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exchangeCode } from "@/lib/calendar/google";

// Google redirects here after consent. `state` is the businessId we sent.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const businessId = url.searchParams.get("state") ?? "";
  const oauthError = url.searchParams.get("error");

  const back = (suffix: string) =>
    NextResponse.redirect(new URL(`/negocios/${businessId}/integracoes${suffix}`, request.url));

  if (oauthError || !code || !businessId) {
    return back("?error=conexao_cancelada");
  }

  // Ensure the logged-in user actually owns this business before storing tokens.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.organizationId !== session.user.organizationId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const { tokens, email } = await exchangeCode(code);

    await prisma.calendarConnection.upsert({
      where: { businessId_provider: { businessId, provider: "GOOGLE" } },
      update: {
        status: "ATIVA",
        accountEmail: email,
        accessToken: tokens.access_token ?? undefined,
        // Google only returns a refresh_token on first consent; keep the old one otherwise.
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
      create: {
        businessId,
        provider: "GOOGLE",
        status: "ATIVA",
        accountEmail: email,
        accessToken: tokens.access_token ?? undefined,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });

    return back("?ok=google_conectado");
  } catch {
    return back("?error=falha_ao_conectar");
  }
}
