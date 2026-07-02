import { prisma } from "@/lib/prisma";
import { generateAiReply } from "@/lib/ai";
import type { Business } from "@/generated/prisma/client";

export async function processIncomingMessage(params: {
  business: Business;
  conversationId: string;
  content: string;
}) {
  const { business, conversationId, content } = params;

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  const customerMessage = await prisma.message.create({
    data: { conversationId, sender: "CLIENTE", content },
  });

  const services = await prisma.service.findMany({
    where: { businessId: business.id, active: true },
    orderBy: { createdAt: "asc" },
  });

  const history = [...conversation.messages, customerMessage].map((m) => ({
    sender: m.sender,
    content: m.content,
  }));

  const result = await generateAiReply({ business, services, history });

  const aiMessage = await prisma.message.create({
    data: { conversationId, sender: "IA", content: result.reply },
  });

  let status = conversation.status;
  if (result.appointment) {
    await prisma.appointment.create({
      data: {
        businessId: business.id,
        contactId: conversation.contactId,
        serviceId: result.appointment.serviceId,
        conversationId,
        scheduledAt: result.appointment.scheduledAt,
      },
    });
    status = "AGENDOU";
  } else if (conversation.status === "NOVA") {
    status = "EM_ATENDIMENTO";
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status, lastMessageAt: new Date() },
  });

  return { customerMessage, aiMessage, status };
}
