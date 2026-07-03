import { NextResponse } from "next/server";
import { requireBusinessApi } from "@/lib/api-access";
import { buildOnboardingUrl, d360Configured } from "@/lib/whatsapp/onboarding";

// Starts the 360dialog one-click onboarding for a business.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId") ?? "";

  const access = await requireBusinessApi(businessId);
  if ("error" in access) return access.error;

  if (!d360Configured()) {
    return NextResponse.redirect(
      new URL(`/negocios/${businessId}/integracoes?error=whatsapp_nao_configurado`, request.url)
    );
  }

  return NextResponse.redirect(buildOnboardingUrl(businessId));
}
