import { NextResponse } from "next/server";
import { syncAllFeeds } from "@/lib/lodging";

// Cron: importa os calendarios do Airbnb/Booking de todas as unidades para
// bloquear datas e nunca dobrar reserva. Protegido por CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const result = await syncAllFeeds();
  return NextResponse.json({ ok: true, ...result });
}
