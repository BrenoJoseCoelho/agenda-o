import type { Business } from "@/generated/prisma/client";

// Thin wrapper around the Meta WhatsApp Cloud API. A business only sends real
// messages once it has whatsappPhoneNumberId + whatsappAccessToken configured
// (see Cerebro > Integracoes). Without those, calls are logged and skipped so
// the rest of the product works in demo mode.
export async function sendWhatsappMessage(business: Business, toPhone: string, text: string) {
  if (!business.whatsappPhoneNumberId || !business.whatsappAccessToken) {
    console.log(`[whatsapp:demo] ${business.name} -> ${toPhone}: ${text}`);
    return { skipped: true as const };
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${business.whatsappPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${business.whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${errorBody}`);
  }

  return { skipped: false as const };
}
