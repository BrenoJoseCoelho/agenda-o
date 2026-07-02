import { NextResponse } from "next/server";
import { requireBusinessApi } from "@/lib/api-access";
import { buildConsentUrl, googleConfigured } from "@/lib/calendar/google";

// Starts the Google OAuth flow for a business. businessId comes as a query param;
// we verify the caller owns it, then redirect to Google's consent screen.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId") ?? "";

  const access = await requireBusinessApi(businessId);
  if ("error" in access) return access.error;

  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL(`/negocios/${businessId}/integracoes?error=google_nao_configurado`, request.url)
    );
  }

  const consentUrl = buildConsentUrl(businessId);
  return NextResponse.redirect(consentUrl);
}
