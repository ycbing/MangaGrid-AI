import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, comicChapters, comicPanels } from "@/lib/db/comic-schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("comic-panel-edit-api");

// 允许编辑的分格字段（白名单，避免越权写入）
const ALLOWED = ["sceneDesc", "dialogue", "narration", "bubbleSide"] as const;
const BUBBLE_SIDES = ["left", "right", "top", "bottom", "center"];

/**
 * PATCH /api/comics/[comicId]/panels/[panelId]
 * 编辑单个分格：场景描述 / 台词 / 旁白 / 气泡方位。
 * 注意：编辑文案不会自动重画已生成的图；如需新图请在工作台点"换一张"。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ comicId: string; panelId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { comicId, panelId } = await params;

    // 权限校验：panel -> chapter -> comic -> 归属
    const panelRow = await db.select().from(comicPanels).where(eq(comicPanels.id, panelId)).limit(1);
    if (!panelRow.length) return NextResponse.json({ error: "分格不存在" }, { status: 404 });
    const chapterRow = await db
      .select()
      .from(comicChapters)
      .where(eq(comicChapters.id, panelRow[0].chapterId))
      .limit(1);
    if (!chapterRow.length) return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    const comicRow = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!comicRow.length) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (comicRow[0].userId !== session.user.id)
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    if (chapterRow[0].comicId !== comicId)
      return NextResponse.json({ error: "分格不属于该作品" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, string> = {};
    for (const key of ALLOWED) {
      if (body[key] !== undefined) {
        let val = String(body[key] ?? "").trim();
        if (key === "bubbleSide") {
          if (!BUBBLE_SIDES.includes(val)) {
            return NextResponse.json({ error: "无效的气泡方位" }, { status: 400 });
          }
        }
        updates[key] = val;
      }
    }
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const [updated] = await db
      .update(comicPanels)
      .set(updates)
      .where(eq(comicPanels.id, panelId))
      .returning();
    return NextResponse.json({ ok: true, panel: updated });
  } catch (err: any) {
    log.error("PATCH panel failed", err);
    return NextResponse.json({ error: err?.message || "更新分格失败" }, { status: 500 });
  }
}
