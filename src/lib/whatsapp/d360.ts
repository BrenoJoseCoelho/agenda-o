import type { Business } from "@/generated/prisma/client";
import type { WhatsappMedia, WhatsappProviderAdapter } from "./types";

// 360dialog (BSP). The business connects via 360dialog's integrated onboarding
// (one click, no tokens to paste) and we store a per-channel D360-API-KEY.
// 360dialog exposes the same Cloud API shape, so payloads match Meta's.
const D360_BASE = "https://waba-v2.360dialog.io";

export const d360Provider: WhatsappProviderAdapter = {
  id: "D360",

  isConnected(business: Business) {
    return Boolean(business.whatsappApiKey);
  },

  async sendMessage(business: Business, toPhone: string, text: string) {
    if (!business.whatsappApiKey) {
      console.log(`[whatsapp:d360:demo] ${business.name} -> ${toPhone}: ${text}`);
      return { skipped: true };
    }

    const res = await fetch(`${D360_BASE}/messages`, {
      method: "POST",
      headers: {
        "D360-API-KEY": business.whatsappApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: { body: text },
      }),
    });

    if (!res.ok) {
      throw new Error(`WhatsApp (360dialog) send failed (${res.status}): ${await res.text()}`);
    }
    return { skipped: false };
  },

  async downloadMedia(business: Business, mediaId: string): Promise<WhatsappMedia | null> {
    if (!business.whatsappApiKey) return null;
    try {
      // 360dialog proxies the Cloud API media endpoints under the same base.
      const metaRes = await fetch(`${D360_BASE}/${mediaId}`, {
        headers: { "D360-API-KEY": business.whatsappApiKey },
      });
      if (!metaRes.ok) return null;
      const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
      if (!meta.url) return null;

      const fileRes = await fetch(meta.url, {
        headers: { "D360-API-KEY": business.whatsappApiKey },
      });
      if (!fileRes.ok) return null;
      return { data: await fileRes.arrayBuffer(), mimeType: meta.mime_type || "audio/ogg" };
    } catch (error) {
      console.error("[whatsapp:d360] media download error:", error);
      return null;
    }
  },
};
