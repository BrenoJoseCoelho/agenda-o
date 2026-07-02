import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessApi } from "@/lib/api-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const access = await requireBusinessApi(businessId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Cliente novo";
  const phone =
    typeof body?.phone === "string" && body.phone.trim()
      ? body.phone.trim()
      : `55119${Math.floor(10000000 + Math.random() * 89999999)}`;

  const contact = await prisma.contact.create({
    data: { businessId, name, phone },
  });

  const conversation = await prisma.conversation.create({
    data: { businessId, contactId: contact.id },
    include: { contact: true, messages: true },
  });

  return NextResponse.json({ conversation });
}
