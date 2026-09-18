import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, comicChapters, comicPanels } from "@/lib/db/comic-schema";
import { eq, inArray } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("comic-panel-reorder-api");

/**
 * POST /api/comics/[comicId]/panels/reorder
 * 重排某章节内分格的顺序。body: { chapterId, panelIds: string[] }（按目标顺序）。
 * 事务处理：先把该章节所有格子 panelNumber 临时置为负数占位，再按传入顺序重编 1..n，
 * 以绕开 (chapterId, panelNumber) 唯一索引冲突。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ comicId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { comicId } = await params;

    const body = await request.json().catch(() => ({}));
    const chapterId: string | undefined = body.chapterId;
    const panelIds: string[] | undefined = body.panelIds;
    if (!chapterId || !Array.isArray(panelIds) || panelIds.length === 0) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    // 权限校验
    const comicRow = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!comicRow.length) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (comicRow[0].userId !== session.user.id)
      return NextResponse.json({ error: "无权访问" }, { status: 403 });

    const chapterRow = await db
      .select()
      .from(comicChapters)
      .where(eq(comicChapters.id, chapterId))
      .limit(1);
    if (!chapterRow.length) return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    if (chapterRow[0].comicId !== comicId)
      return NextResponse.json({ error: "章节不属于该作品" }, { status: 400 });

    // 该章节现有格子，校验传入的 panelIds 与之一致
    const existing = await db
      .select({ id: comicPanels.id })
      .from(comicPanels)
      .where(eq(comicPanels.chapterId, chapterId));
    const existingIds = new Set(existing.map((p) => p.id));
    if (panelIds.length !== existing.length || panelIds.some((id) => !existingIds.has(id))) {
      return NextResponse.json({ error: "分格列表与章节不符" }, { status: 400 });
    }

    // 事务重排：占位 -> 重编
    await db.transaction(async (tx) => {
      for (let i = 0; i < panelIds.length; i++) {
        await tx
          .update(comicPanels)
          .set({ panelNumber: -(i + 1) })
          .where(eq(comicPanels.id, panelIds[i]));
      }
      for (let i = 0; i < panelIds.length; i++) {
        await tx
          .update(comicPanels)
          .set({ panelNumber: i + 1 })
          .where(eq(comicPanels.id, panelIds[i]));
      }
    });

    const updated = await db
      .select()
      .from(comicPanels)
      .where(inArray(comicPanels.id, panelIds))
      .orderBy(comicPanels.panelNumber);
    return NextResponse.json({ ok: true, panels: updated });
  } catch (err: any) {
    log.error("reorder panels failed", err);
    return NextResponse.json({ error: err?.message || "重排分格失败" }, { status: 500 });
  }
}
