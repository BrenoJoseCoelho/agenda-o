import type { Business } from "@/generated/prisma/client";
import type { WhatsappMedia, WhatsappProviderAdapter } from "./types";

// Meta WhatsApp Cloud API (direct). Requires the business to have a phone
// number id + access token — the technical path, kept for advanced users.
export const metaProvider: WhatsappProviderAdapter = {
  id: "META",

  isConnected(business: Business) {
    return Boolean(business.whatsappPhoneNumberId && business.whatsappAccessToken);
  },

  async sendMessage(business: Business, toPhone: string, text: string) {
    if (!business.whatsappPhoneNumberId || !business.whatsappAccessToken) {
      console.log(`[whatsapp:meta:demo] ${business.name} -> ${toPhone}: ${text}`);
      return { skipped: true };
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
      throw new Error(`WhatsApp (Meta) send failed (${res.status}): ${await res.text()}`);
    }
    return { skipped: false };
  },

  async downloadMedia(business: Business, mediaId: string): Promise<WhatsappMedia | null> {
    if (!business.whatsappAccessToken) return null;
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${business.whatsappAccessToken}` },
      });
      if (!metaRes.ok) return null;
      const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
      if (!meta.url) return null;

      const fileRes = await fetch(meta.url, {
        headers: { Authorization: `Bearer ${business.whatsappAccessToken}` },
      });
      if (!fileRes.ok) return null;
      return { data: await fileRes.arrayBuffer(), mimeType: meta.mime_type || "audio/ogg" };
    } catch (error) {
      console.error("[whatsapp:meta] media download error:", error);
      return null;
    }
  },
};
