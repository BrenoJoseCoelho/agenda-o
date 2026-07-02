import { prisma } from "@/lib/prisma";
import { generateAiReply } from "@/lib/ai";
import { checkAvailability, pushEventToCalendar } from "@/lib/calendar";
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

  let status = conversation.status;
  let reply = result.reply;

  if (result.appointment) {
    const service = services.find((s) => s.id === result.appointment!.serviceId);
    const duration = service?.durationMinutes ?? 30;
    const start = result.appointment.scheduledAt;

    // Check both our own bookings and the connected external calendar before confirming.
    const availability = await checkAvailability(business, start, duration);

    if (!availability.available) {
      // Don't confirm a slot that is taken — ask for another time instead.
      reply = `Ihh, ${availability.reason}. Consegue outro horario?`;
      if (conversation.status === "NOVA") status = "EM_ATENDIMENTO";
    } else {
      const pushed = await pushEventToCalendar({
        business,
        summary: service ? `${service.name} - Atende AI` : "Agendamento - Atende AI",
        description: "Agendado automaticamente pela atendente de IA.",
        start,
        durationMinutes: duration,
      });

      await prisma.appointment.create({
        data: {
          businessId: business.id,
          contactId: conversation.contactId,
          serviceId: result.appointment.serviceId,
          conversationId,
          scheduledAt: start,
          externalProvider: pushed?.provider,
          externalEventId: pushed?.eventId,
        },
      });
      status = "AGENDOU";
    }
  } else if (conversation.status === "NOVA") {
    status = "EM_ATENDIMENTO";
  }

  const aiMessage = await prisma.message.create({
    data: { conversationId, sender: "IA", content: reply },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status, lastMessageAt: new Date() },
  });

  return { customerMessage, aiMessage, status };
}
