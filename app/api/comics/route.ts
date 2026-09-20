import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, comicChapters, comicCharacters, comicPanels } from "@/lib/db/comic-schema";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { generateComicScript } from "@/lib/ai/comic-script-generator";
import { deductCredits, requireCreditDeduction, refundCredits } from "@/lib/credits";
import { createLogger } from "@/lib/logger";

const log = createLogger("comics-api");

// GET /api/comics — 作品列表（支持 q 搜索 / sort 排序，附带分格进度统计）
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const q = searchParams.get("q")?.trim() || "";
    const sort = searchParams.get("sort") || "createdAt"; // createdAt | updatedAt | title

    const conditions = [eq(comics.userId, session.user.id)];
    if (status && status !== "all") conditions.push(eq(comics.status, status));
    if (q) {
      const fuzzy = or(ilike(comics.title, `%${q}%`), ilike(comics.description, `%${q}%`));
      if (fuzzy) conditions.push(fuzzy);
    }

    const orderBy =
      sort === "updatedAt"
        ? [desc(comics.updatedAt)]
        : sort === "title"
          ? [asc(comics.title)]
          : [desc(comics.createdAt)];

    const list = await db
      .select()
      .from(comics)
      .where(and(...conditions))
      .orderBy(...orderBy);

    // 分格统计（经 chapters 关联到 comicId），JS 合并
    const ids = list.map((c) => c.id);
    const stats = ids.length
      ? await db
          .select({
            comicId: comicChapters.comicId,
            total: sql<number>`count(*)::int`,
            done: sql<number>`count(*) filter (where ${comicPanels.status} = 'done')::int`,
          })
          .from(comicPanels)
          .innerJoin(comicChapters, eq(comicPanels.chapterId, comicChapters.id))
          .where(inArray(comicChapters.comicId, ids))
          .groupBy(comicChapters.comicId)
      : [];
    const statMap = new Map(stats.map((s) => [s.comicId, s]));

    return NextResponse.json({
      comics: list.map((c) => ({
        ...c,
        panelTotal: statMap.get(c.id)?.total ?? 0,
        panelDone: statMap.get(c.id)?.done ?? 0,
      })),
    });
  } catch (err: any) {
    log.error("GET /api/comics failed", err);
    return NextResponse.json({ error: err?.message || "获取作品失败" }, { status: 500 });
  }
}

// POST /api/comics — 创建作品 + 生成漫画脚本
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const body = await request.json();
    const { title, sourceText, genre = "fantasy", style = "manhua", layoutType = "strip", panelCount } = body;

    if (!sourceText || sourceText.trim().length < 10) {
      return NextResponse.json({ error: "请提供至少 10 字的创意或小说内容" }, { status: 400 });
    }

    // 扣积分（脚本 2 分）
    const deduction = await requireCreditDeduction(
      session.user.id,
      "comicScript",
      2,
      undefined,
      `生成漫画脚本: ${sourceText.slice(0, 40)}...`
    );
    if (!deduction.ok) {
      return NextResponse.json(
        { error: deduction.error || "积分不足", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    // 创建作品行
    const comicId = uuidv4();
    const shareToken = uuidv4().replace(/-/g, "").slice(0, 12);
    await db.insert(comics).values({
      id: comicId,
      userId: session.user.id,
      title: title?.trim() || "未命名漫画",
      sourceText: sourceText.trim(),
      genre,
      style,
      layoutType,
      status: "generating",
      shareToken,
    });

    try {
      // 生成漫画脚本
      const script = await generateComicScript(sourceText, {
        genre,
        style,
        layoutType,
        panelCount: panelCount || undefined,
        userId: session.user.id,
      });

      // 存角色卡
      for (const c of script.characters) {
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
      }

      // 存第一话 + 全部格子
      const chapterId = uuidv4();
      await db.insert(comicChapters).values({
        id: chapterId,
        comicId,
        chapterNumber: 1,
        title: script.title,
        scriptContent: script as any,
        status: "scripted",
      });

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

      // 更新作品状态
      await db
        .update(comics)
        .set({ status: "script_ready", title: script.title, updatedAt: new Date() })
        .where(eq(comics.id, comicId));

      log.info(`漫画创建成功: ${comicId}, ${panelNum}格`);
      return NextResponse.json({ comicId, status: "script_ready", title: script.title, panelCount: panelNum });
    } catch (err: any) {
      // 失败退款 + 标记错误
      await refundCredits(session.user.id, 2, undefined, `漫画脚本生成失败退款`).catch(() => {});
      await db.update(comics).set({ status: "error", updatedAt: new Date() }).where(eq(comics.id, comicId));
      log.error("生成漫画脚本失败", err);
      return NextResponse.json({ error: err?.message || "生成脚本失败" }, { status: 500 });
    }
  } catch (err: any) {
    log.error("POST /api/comics failed", err);
    return NextResponse.json({ error: err?.message || "创建失败" }, { status: 500 });
  }
}