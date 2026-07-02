import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processIncomingMessage } from "@/lib/conversation-engine";
import { sendWhatsappMessage } from "@/lib/whatsapp";

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
        messages?: Array<{ from?: string; text?: { body?: string }; type?: string }>;
      };
    }>;
  }>;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as WhatsappWebhookPayload | null;
  if (!payload) return NextResponse.json({ ok: true });

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const incoming = value?.messages?.[0];
      if (!phoneNumberId || !incoming?.text?.body || !incoming.from) continue;

      const business = await prisma.business.findFirst({
        where: { whatsappPhoneNumberId: phoneNumberId },
      });
      if (!business) continue;

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
        content: incoming.text.body,
      });

      await sendWhatsappMessage(business, incoming.from, aiMessage.content);
    }
  }

  return NextResponse.json({ ok: true });
}
