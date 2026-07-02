import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireBusiness(businessId: string) {
  const session = await requireSession();
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });
  if (!business || business.organizationId !== session.user.organizationId) {
    notFound();
  }
  return { session, business };
}
