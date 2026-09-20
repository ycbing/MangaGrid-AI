// ============================================
// POST /api/templates/[id]/use — 模板使用计数 +1（公开）
// 运营展示指标，非计费依据；市场页点击时 fire-and-forget 调用
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comicTemplates } from "@/lib/db/comic-template-schema";
import { and, eq, sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("templates-api");

// POST — 使用计数 +1
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [updated] = await db
      .update(comicTemplates)
      .set({
        useCount: sql`${comicTemplates.useCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(comicTemplates.id, id), eq(comicTemplates.enabled, true)))
      .returning({ useCount: comicTemplates.useCount });

    if (!updated) {
      return NextResponse.json({ error: "模板不存在或已下架" }, { status: 404 });
    }

    return NextResponse.json({ useCount: updated.useCount });
  } catch (error) {
    log.error("POST /api/templates/[id]/use failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "计数失败" }, { status: 500 });
  }
}
