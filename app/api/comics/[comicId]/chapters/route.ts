import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, comicChapters, comicCharacters, comicPanels } from "@/lib/db/comic-schema";
import { eq, max } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { generateComicScript, type ComicScriptCharacter } from "@/lib/ai/comic-script-generator";
import { requireCreditDeduction, refundCredits } from "@/lib/credits";
import { createLogger } from "@/lib/logger";

const log = createLogger("comic-chapter-api");

// POST /api/comics/[comicId]/chapters — 为已有作品续写下一话
export async function POST(request: NextRequest, { params }: { params: Promise<{ comicId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { comicId } = await params;

    // 校验作品归属
    const [comic] = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!comic) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (comic.userId !== session.user.id) return NextResponse.json({ error: "无权访问" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const continuation = (body.continuation as string)?.trim() || "";
    const panelCount = body.panelCount ? Number(body.panelCount) : undefined;

    // 获取已有角色卡（续写必须复用，避免形象漂移）
    const existingChars = await db
      .select()
      .from(comicCharacters)
      .where(eq(comicCharacters.comicId, comicId));
    if (!existingChars.length) {
      return NextResponse.json(
        { error: "该作品还没有角色卡，请先完成第一话并锁定角色后再续写" },
        { status: 400 }
      );
    }

    // 下一话编号 = 当前最大话数 + 1
    const [maxRow] = await db
      .select({ m: max(comicChapters.chapterNumber) })
      .from(comicChapters)
      .where(eq(comicChapters.comicId, comicId));
    const chapterNumber = (maxRow?.m ?? 0) + 1;

    // 扣积分（脚本 2 分）
    const deduction = await requireCreditDeduction(
      session.user.id,
      "comicScript",
      2,
      undefined,
      `续写第${chapterNumber}话: ${comic.title}`
    );
    if (!deduction.ok) {
      return NextResponse.json(
        { error: deduction.error || "积分不足", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    const chapterId = uuidv4();
    try {
      const input = continuation || comic.sourceText || "";
      if (!input || input.trim().length < 5) {
        throw new Error("缺少续写内容或上文，无法生成");
      }

      const script = await generateComicScript(input, {
        genre: comic.genre || undefined,
        style: comic.style || undefined,
        layoutType: (comic.layoutType as any) || undefined,
        panelCount,
        chapterNumber,
        existingCharacters: existingChars.map((c): ComicScriptCharacter => ({
          name: c.name,
          role: (c.role as ComicScriptCharacter["role"]) || "supporting",
          gender: c.gender || "",
          age: c.age || "",
          appearance: c.appearance,
          personality: c.personality || "",
        })),
        continuity: comic.sourceText || undefined,
        userId: session.user.id,
      });

      // 新增角色落库（名字不在已有角色中才插入）
      const existingNames = new Set(existingChars.map((c) => c.name));
      for (const c of script.characters) {
        if (existingNames.has(c.name)) continue;
        await db.insert(comicCharacters).values({
          id: uuidv4(),
          comicId,
          name: c.name,
          role: c.role,
          gender: c.gender,
          age: c.age,
          appearance: c.appearance,
          personality: c.personality,
        });
        existingNames.add(c.name);
      }

      // 存新章节
      await db.insert(comicChapters).values({
        id: chapterId,
        comicId,
        chapterNumber,
        title: script.title,
        scriptContent: script as any,
        status: "scripted",
      });

      // 存格子
      let panelNum = 0;
      for (const scene of script.scenes) {
        for (const panel of scene.panels) {
          panelNum += 1;
          await db.insert(comicPanels).values({
            id: uuidv4(),
            chapterId,
            panelNumber: panelNum,
            sceneDesc: panel.scene_desc,
            characters: panel.characters as any,
            dialogue: panel.dialogue || null,
            narration: panel.narration || null,
            bubbleSide: panel.bubble_side || "left",
            status: "pending",
          });
        }
      }

      // 更新作品话数
      await db
        .update(comics)
        .set({ chapterCount: chapterNumber, updatedAt: new Date() })
        .where(eq(comics.id, comicId));

      log.info(`续写成功: ${comicId} 第${chapterNumber}话 ${script.title}, ${panelNum}格`);
      return NextResponse.json({ chapterId, chapterNumber, title: script.title, panelCount: panelNum });
    } catch (err: any) {
      await refundCredits(session.user.id, 2, undefined, `续写第${chapterNumber}话失败退款`).catch(() => {});
      log.error("续写下一话失败", err);
      return NextResponse.json({ error: err?.message || "续写失败" }, { status: 500 });
    }
  } catch (err: any) {
    log.error("POST /api/comics/[comicId]/chapters failed", err);
    return NextResponse.json({ error: err?.message || "续写失败" }, { status: 500 });
  }
}
