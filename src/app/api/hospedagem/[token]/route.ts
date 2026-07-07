import { prisma } from "@/lib/prisma";
import { buildUnitIcal } from "@/lib/ical";

// Feed iCal publico (token nao-adivinhavel) das reservas DIRETAS de uma unidade.
// Cole esta URL no Airbnb/Booking ("importar calendario") para eles bloquearem
// as datas que voce reservou aqui.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const unit = await prisma.rentalUnit.findUnique({ where: { icsToken: token } });
  if (!unit) return new Response("Not found", { status: 404 });

  // So exporta as reservas feitas aqui (as importadas do Airbnb ja estao la).
  const reservations = await prisma.reservation.findMany({
    where: { unitId: unit.id, status: "CONFIRMADA", source: "DIRETO" },
    orderBy: { checkIn: "asc" },
  });

  const body = buildUnitIcal(unit.name, reservations);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="atende-ai-${unit.icsToken}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
