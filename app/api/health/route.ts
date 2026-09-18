import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Check DB connection
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(sql`SELECT 1 as result`);
    checks.database = { ok: true, detail: "PostgreSQL connected" };
  } catch (err) {
    checks.database = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }

  // Check COS configuration
  try {
    const { isCosConfigured } = await import("@/lib/ai/cos-storage");
    checks.cos = { ok: isCosConfigured(), detail: isCosConfigured() ? "COS configured" : "COS not configured" };
  } catch (err) {
    checks.cos = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }

  // Check GLM API key
  try {
    const apiKey = process.env.GLM_API_KEY;
    checks.glm_api = { ok: !!apiKey, detail: apiKey ? "API key set" : "API key missing" };
  } catch {
    checks.glm_api = { ok: false, detail: "Failed to check" };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
