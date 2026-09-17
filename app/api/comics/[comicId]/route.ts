import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, comicChapters, comicCharacters, comicPanels } from "@/lib/db/comic-schema";
import { eq, and, inArray } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("comic-detail-api");

// GET /api/comics/[comicId] — 详情（含角色/章节/格子）
export async function GET(request: NextRequest, { params }: { params: Promise<{ comicId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { comicId } = await params;

    const comic = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!comic.length) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (comic[0].userId !== session.user.id) return NextResponse.json({ error: "无权访问" }, { status: 403 });

    const characters = await db
      .select()
      .from(comicCharacters)
      .where(eq(comicCharacters.comicId, comicId))
      .orderBy(comicCharacters.createdAt);

    const chapters = await db
      .select()
      .from(comicChapters)
      .where(eq(comicChapters.comicId, comicId))
      .orderBy(comicChapters.chapterNumber);

    // 拉取所有章节格子
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
      (panelsByChapter[p.chapterId] ||= []).push(p);
    }

    return NextResponse.json({
      comic: comic[0],
      characters,
      chapters: chapters.map((c) => ({ ...c, panels: panelsByChapter[c.id] || [] })),
    });
  } catch (err: any) {
    log.error("GET comic detail failed", err);
    return NextResponse.json({ error: err?.message || "获取详情失败" }, { status: 500 });
  }
}

// PATCH /api/comics/[comicId] — 更新标题/描述/风格等
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ comicId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { comicId } = await params;

    const existing = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!existing.length) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (existing[0].userId !== session.user.id) return NextResponse.json({ error: "无权访问" }, { status: 403 });

    const body = await request.json();
    const allowed = ["title", "description", "style", "layoutType", "coverUrl", "status", "genre"];
    const updates: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const [updated] = await db.update(comics).set(updates).where(eq(comics.id, comicId)).returning();
    return NextResponse.json({ comic: updated });
  } catch (err: any) {
    log.error("PATCH comic failed", err);
    return NextResponse.json({ error: err?.message || "更新失败" }, { status: 500 });
  }
}

// DELETE /api/comics/[comicId]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ comicId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { comicId } = await params;

    const existing = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!existing.length) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (existing[0].userId !== session.user.id) return NextResponse.json({ error: "无权访问" }, { status: 403 });

    await db.delete(comics).where(eq(comics.id, comicId)); // 级联删角色/章节/格子
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    log.error("DELETE comic failed", err);
    return NextResponse.json({ error: err?.message || "删除失败" }, { status: 500 });
  }
}