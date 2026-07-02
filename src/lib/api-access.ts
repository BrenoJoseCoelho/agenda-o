import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireBusinessApi(businessId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) } as const;
  }
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.organizationId !== session.user.organizationId) {
    return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) } as const;
  }
  return { session, business } as const;
}
