// 360dialog Integrated Onboarding — the "one click, no tokens" connect flow.
//
// Platform-level setup (done ONCE by the SaaS owner, not by each customer):
//   - Create a 360dialog Partner account -> get D360_PARTNER_ID
//   - Get a Partner API token -> D360_PARTNER_API_TOKEN
//
// Customer experience: click "Conectar WhatsApp" -> 360dialog onboarding opens
// -> they connect their number -> we capture the credentials automatically.

const HUB_BASE = "https://hub.360dialog.io";
const HUB_UI = "https://hub.360dialog.com";

export function d360Configured(): boolean {
  return Boolean(process.env.D360_PARTNER_ID);
}

function appUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

// The URL the customer is sent to. On completion, 360dialog redirects back to
// our callback with ?client=<id>&channels=<id> appended. `state` carries the businessId.
export function buildOnboardingUrl(state: string): string {
  const partnerId = process.env.D360_PARTNER_ID!;
  const redirect = `${appUrl()}/api/integrations/whatsapp/d360/callback`;
  const params = new URLSearchParams({
    redirect_url: redirect,
    state,
  });
  return `${HUB_UI}/dashboard/app/${partnerId}/permissions?${params.toString()}`;
}

// Exchanges the channel id (from the callback) for a per-channel D360-API-KEY
// using the Partner API. Returns null if the platform partner creds are missing
// or the call fails, so the caller degrades gracefully.
export async function generateChannelApiKey(channelId: string): Promise<string | null> {
  const partnerId = process.env.D360_PARTNER_ID;
  const partnerToken = process.env.D360_PARTNER_API_TOKEN;
  if (!partnerId || !partnerToken) return null;

  try {
    const res = await fetch(
      `${HUB_BASE}/api/v2/partners/${partnerId}/channels/${channelId}/api_keys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${partnerToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) {
      console.error(`[d360] api_key generation failed (${res.status}): ${await res.text()}`);
      return null;
    }
    const data = (await res.json()) as { api_key?: string };
    return data.api_key ?? null;
  } catch (error) {
    console.error("[d360] api_key generation error:", error);
    return null;
  }
}

// Points the channel's inbound webhook at our handler so incoming messages
// (text + audio) reach the AI. Best-effort.
export async function setChannelWebhook(apiKey: string): Promise<void> {
  try {
    await fetch("https://waba-v2.360dialog.io/v1/configs/webhook", {
      method: "POST",
      headers: { "D360-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ url: `${appUrl()}/api/whatsapp/webhook` }),
    });
  } catch (error) {
    console.error("[d360] set webhook error:", error);
  }
}
