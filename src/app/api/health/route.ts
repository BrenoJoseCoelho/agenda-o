import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Health check for deploy platforms/monitoring. Confirms the app is up and the
// database is reachable.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up" });
  } catch {
    return NextResponse.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
