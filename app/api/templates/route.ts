// ============================================
// GET /api/templates — 模板市场列表（公开，仅上架）
// query: genre?（题材过滤）、sort?（latest 默认 | hot）
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comicTemplates } from "@/lib/db/comic-template-schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("templates-api");

const VALID_GENRES = ["fantasy", "urban", "ancient", "mystery", "romance", "scifi"];

// GET — 上架模板列表（不含 content，详情走 /api/templates/[id]）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre");
    const sort = searchParams.get("sort") === "hot" ? "hot" : "latest";

    const conditions = [eq(comicTemplates.enabled, true)];
    if (genre && VALID_GENRES.includes(genre)) {
      conditions.push(eq(comicTemplates.genre, genre));
    }

    const rows = await db
      .select({
        id: comicTemplates.id,
        title: comicTemplates.title,
        description: comicTemplates.description,
        genre: comicTemplates.genre,
        style: comicTemplates.style,
        layoutType: comicTemplates.layoutType,
        panelCount: comicTemplates.panelCount,
        emoji: comicTemplates.emoji,
        grad: comicTemplates.grad,
        tags: comicTemplates.tags,
        useCount: comicTemplates.useCount,
        sortOrder: comicTemplates.sortOrder,
        createdAt: comicTemplates.createdAt,
      })
      .from(comicTemplates)
      .where(and(...conditions))
      .orderBy(
        asc(comicTemplates.sortOrder),
        sort === "hot" ? desc(comicTemplates.useCount) : desc(comicTemplates.createdAt)
      );

    return NextResponse.json({ templates: rows });
  } catch (error) {
    log.error("GET /api/templates failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "获取模板失败" }, { status: 500 });
  }
}
