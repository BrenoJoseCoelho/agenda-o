import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

// True only for the platform owner (email listed in SUPER_ADMIN_EMAIL).
export function isSuperAdmin(email?: string | null): boolean {
  const allowed = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  return Boolean(allowed && email && email.toLowerCase().trim() === allowed);
}

// Gate for the master (platform-owner) area. Uses notFound so the area is
// invisible to everyone else — no hint that it exists.
export async function requireSuperAdmin() {
  const session = await requireSession();
  if (!isSuperAdmin(session.user.email)) notFound();
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
