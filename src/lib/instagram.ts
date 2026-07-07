import type { Business } from "@/generated/prisma/client";

const GRAPH = "https://graph.facebook.com/v21.0";

export function isInstagramConnected(business: Business): boolean {
  return Boolean(business.instagramAccountId && business.instagramAccessToken);
}

// Sends a DM reply through the Instagram Messaging API (Meta Graph).
// Degrades to a log when the account isn't connected, so the AI can be tested
// without credentials (same pattern as the WhatsApp adapter).
export async function sendInstagramMessage(
  business: Business,
  recipientId: string,
  text: string
): Promise<void> {
  if (!isInstagramConnected(business)) {
    console.log(`[instagram:demo] -> ${recipientId}: ${text}`);
    return;
  }

  try {
    const res = await fetch(`${GRAPH}/me/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${business.instagramAccessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });
    if (!res.ok) {
      console.error(`[instagram] send failed ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[instagram] send error", err);
  }
}
