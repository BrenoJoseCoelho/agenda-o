import { NextResponse } from "next/server";
import { runAutomationsAllBusinesses } from "@/lib/automations";
import { AUTOMATIONS_ENABLED } from "@/lib/features";

// Scheduled endpoint. In production, point a cron (e.g. Vercel Cron) at this URL
// every hour. Protected by CRON_SECRET so only the scheduler can trigger it.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // Automações fora do lançamento: cron vira no-op até religar o flag.
  if (!AUTOMATIONS_ENABLED) {
    return NextResponse.json({ ok: true, skipped: "automations_disabled" });
  }

  const result = await runAutomationsAllBusinesses();
  return NextResponse.json({ ok: true, ...result });
}
