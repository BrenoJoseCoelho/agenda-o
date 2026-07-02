import { requireBusiness } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import ConversasClient from "./ConversasClient";

export default async function ConversasPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { business } = await requireBusiness(businessId);

  const conversations = await prisma.conversation.findMany({
    where: { businessId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <ConversasClient
      businessId={businessId}
      aiName={business.aiName}
      initialConversations={JSON.parse(JSON.stringify(conversations))}
    />
  );
}
