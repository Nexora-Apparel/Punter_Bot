import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      service: "punter-ai",
      status: "degraded",
      database: "not_configured",
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }

  try {
    const db = getDatabase();
    await db.execute(sql`select 1`);
    return NextResponse.json({
      service: "punter-ai",
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      service: "punter-ai",
      status: "degraded",
      database: "unavailable",
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}