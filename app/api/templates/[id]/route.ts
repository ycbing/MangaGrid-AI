// ============================================
// GET /api/templates/[id] — 模板详情（公开，仅上架）
// 向导 ?template=<id> 联动取 content 用
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comicTemplates } from "@/lib/db/comic-template-schema";
import { and, eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("templates-api");

// GET — 模板详情
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [template] = await db
      .select()
      .from(comicTemplates)
      .where(and(eq(comicTemplates.id, id), eq(comicTemplates.enabled, true)))
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "模板不存在或已下架" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    log.error("GET /api/templates/[id] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "获取模板失败" }, { status: 500 });
  }
}
