import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comics, comicChapters, comicCharacters, comicPanels } from "@/lib/db/comic-schema";
import { eq, inArray, sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("public-comic-share");

// GET /api/share-comic/[token] — 公开漫画分享数据（无需登录）
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token) return NextResponse.json({ error: "无效链接" }, { status: 400 });

    const [comic] = await db.select().from(comics).where(eq(comics.shareToken, token)).limit(1);
    if (!comic) return NextResponse.json({ error: "漫画不存在或链接已失效" }, { status: 404 });

    // 分享计数 +1
    await db
      .update(comics)
      .set({ shareCount: sql`${comics.shareCount} + 1` })
      .where(eq(comics.id, comic.id))
      .catch(() => {});

    const chapters = await db
      .select()
      .from(comicChapters)
      .where(eq(comicChapters.comicId, comic.id))
      .orderBy(comicChapters.chapterNumber);

    const chapterIds = chapters.map((c) => c.id);
    const panels = chapterIds.length
      ? await db
          .select()
          .from(comicPanels)
          .where(inArray(comicPanels.chapterId, chapterIds))
          .orderBy(comicPanels.panelNumber)
      : [];

    const panelsByChapter: Record<string, typeof panels> = {};
    for (const p of panels) {
      if (p.status === "done" && p.imageUrl) (panelsByChapter[p.chapterId] ||= []).push(p);
    }

    return NextResponse.json({
      comic: {
        id: comic.id,
        title: comic.title,
        description: comic.description,
        style: comic.style,
        layoutType: comic.layoutType,
        shareCount: comic.shareCount,
        createdAt: comic.createdAt,
      },
      chapters: chapters.map((c) => ({
        id: c.id,
        chapterNumber: c.chapterNumber,
        title: c.title,
        panels: panelsByChapter[c.id] || [],
      })),
    });
  } catch (err: any) {
    log.error("share-comic API failed", err);
    return NextResponse.json({ error: err?.message || "获取分享内容失败" }, { status: 500 });
  }
}