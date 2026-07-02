import { prisma } from "@/lib/prisma";
import { buildIcsFeed } from "@/lib/calendar/ics";

// Public, unauthenticated ICS feed identified by an unguessable per-business token.
// Subscribe to this URL from any calendar app. Revoke by regenerating the token.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const business = await prisma.business.findUnique({ where: { icsToken: token } });
  if (!business) {
    return new Response("Not found", { status: 404 });
  }

  const appointments = await prisma.appointment.findMany({
    where: { businessId: business.id, status: { not: "CANCELADO" } },
    include: { contact: true, service: true },
    orderBy: { scheduledAt: "asc" },
  });

  const body = buildIcsFeed(business.name, appointments);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="atende-ai-${business.slug}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
