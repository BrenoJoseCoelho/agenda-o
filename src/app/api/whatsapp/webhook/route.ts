import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processIncomingMessage } from "@/lib/conversation-engine";
import { sendWhatsappMessage, downloadWhatsappMedia } from "@/lib/whatsapp";
import { transcribeAudio, transcriptionConfigured } from "@/lib/transcription";

// Confirms the POST really came from Meta by checking the X-Hub-Signature-256
// HMAC over the raw body with the App Secret. Only enforced when
// WHATSAPP_APP_SECRET is set (so the BSP/demo paths keep working).
function verifiedSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // not configured -> skip (dev / BSP)
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Meta Cloud API webhook verification handshake.
// Configure this same URL + WHATSAPP_VERIFY_TOKEN in the Meta App dashboard.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type WhatsappWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
          audio?: { id?: string; mime_type?: string };
          voice?: { id?: string; mime_type?: string };
        }>;
      };
    }>;
  }>;
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifiedSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: WhatsappWebhookPayload | null = null;
  try {
    payload = JSON.parse(rawBody) as WhatsappWebhookPayload;
  } catch {
    payload = null;
  }
  if (!payload) return NextResponse.json({ ok: true });

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const incoming = value?.messages?.[0];
      if (!phoneNumberId || !incoming?.from) continue;

      const business = await prisma.business.findFirst({
        where: { whatsappPhoneNumberId: phoneNumberId },
      });
      if (!business) continue;

      // Resolve the message text — either the text body, or a transcribed audio.
      let content = incoming.text?.body?.trim() ?? "";
      const audioMedia = incoming.audio ?? incoming.voice;

      if (!content && audioMedia?.id) {
        if (!transcriptionConfigured()) {
          // No transcription provider configured — ask the customer to send text.
          await sendWhatsappMessage(
            business,
            incoming.from,
            "Ainda nao consigo ouvir audios por aqui 😅 Pode me mandar por texto?"
          );
          continue;
        }
        const media = await downloadWhatsappMedia(business, audioMedia.id);
        const transcript = media ? await transcribeAudio(media.data, media.mimeType) : null;
        if (!transcript) {
          await sendWhatsappMessage(
            business,
            incoming.from,
            "Nao consegui entender o audio, pode repetir ou mandar por texto?"
          );
          continue;
        }
        content = transcript;
      }

      if (!content) continue; // unsupported message type (image, sticker, etc.)

      const contactName = value?.contacts?.[0]?.profile?.name ?? incoming.from;

      const contact = await prisma.contact.upsert({
        where: { businessId_phone: { businessId: business.id, phone: incoming.from } },
        update: {},
        create: { businessId: business.id, phone: incoming.from, name: contactName },
      });

      let conversation = await prisma.conversation.findFirst({
        where: { businessId: business.id, contactId: contact.id, status: { in: ["NOVA", "EM_ATENDIMENTO"] } },
        orderBy: { createdAt: "desc" },
      });
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { businessId: business.id, contactId: contact.id },
        });
      }

      const { aiMessage } = await processIncomingMessage({
        business,
        conversationId: conversation.id,
        content,
      });

      await sendWhatsappMessage(business, incoming.from, aiMessage.content);
    }
  }

  return NextResponse.json({ ok: true });
}
