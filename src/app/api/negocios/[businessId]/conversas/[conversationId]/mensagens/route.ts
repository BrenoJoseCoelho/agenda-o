import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessApi } from "@/lib/api-access";
import { processIncomingMessage } from "@/lib/conversation-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string; conversationId: string }> }
) {
  const { businessId, conversationId } = await params;
  const access = await requireBusinessApi(businessId);
  if ("error" in access) return access.error;
  const { business } = access;

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.businessId !== business.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { customerMessage, aiMessage, status } = await processIncomingMessage({
    business,
    conversationId,
    content,
  });

  return NextResponse.json({ messages: [customerMessage, aiMessage], status });
}
