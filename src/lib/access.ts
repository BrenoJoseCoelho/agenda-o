import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

// Accepts either a slug (used in URLs) or a raw id (legacy links / OAuth state),
// so old bookmarks keep working after we moved routes to slugs.
export async function requireBusiness(slugOrId: string) {
  const session = await requireSession();
  const business = await prisma.business.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
  });
  if (!business || business.organizationId !== session.user.organizationId) {
    notFound();
  }
  return { session, business };
}
