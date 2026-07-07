import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processIncomingMessage } from "@/lib/conversation-engine";
import { sendInstagramMessage } from "@/lib/instagram";
import { INSTAGRAM_ENABLED } from "@/lib/features";

// Same Meta app as WhatsApp, so it reuses WHATSAPP_APP_SECRET for the HMAC and
// WHATSAPP_VERIFY_TOKEN for the subscription handshake.
function verifiedSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // nao configurado -> pula (dev)
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

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

type IgPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      message?: { text?: string; is_echo?: boolean };
    }>;
  }>;
};

export async function POST(request: Request) {
  // Instagram fora do lançamento: responde OK mas não processa até religar o flag.
  if (!INSTAGRAM_ENABLED) return NextResponse.json({ ok: true, skipped: "instagram_disabled" });

  const rawBody = await request.text();
  if (!verifiedSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: IgPayload | null = null;
  try {
    payload = JSON.parse(rawBody) as IgPayload;
  } catch {
    payload = null;
  }
  if (!payload) return NextResponse.json({ ok: true });

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      const igAccountId = event.recipient?.id ?? entry.id;
      const content = event.message?.text?.trim();

      // Ignora ecos (mensagens que nos mesmos enviamos) e nao-texto.
      if (event.message?.is_echo || !senderId || !igAccountId || !content) continue;

      const business = await prisma.business.findFirst({
        where: { instagramAccountId: igAccountId },
      });
      if (!business) continue;

      // O identificador do IG entra como "phone" prefixado, para nao colidir
      // com telefones reais do WhatsApp.
      const externalId = `ig:${senderId}`;
      const contact = await prisma.contact.upsert({
        where: { businessId_phone: { businessId: business.id, phone: externalId } },
        update: {},
        create: { businessId: business.id, phone: externalId, name: `Instagram ${senderId.slice(-4)}` },
      });

      let conversation = await prisma.conversation.findFirst({
        where: {
          businessId: business.id,
          contactId: contact.id,
          status: { in: ["NOVA", "EM_ATENDIMENTO"] },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { businessId: business.id, contactId: contact.id, channel: "INSTAGRAM" },
        });
      }

      const { aiMessage } = await processIncomingMessage({
        business,
        conversationId: conversation.id,
        content,
      });

      await sendInstagramMessage(business, senderId, aiMessage.content);
    }
  }

  return NextResponse.json({ ok: true });
}
