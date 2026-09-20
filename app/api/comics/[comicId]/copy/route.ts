import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, comicChapters, comicCharacters, comicPanels } from "@/lib/db/comic-schema";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "@/lib/logger";

const log = createLogger("comic-copy-api");

// POST /api/comics/[comicId]/copy — 深拷贝作品（复用已生成图片，不重新生图/不扣积分）
export async function POST(request: NextRequest, { params }: { params: Promise<{ comicId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const { comicId } = await params;

    const rows = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!rows.length) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (rows[0].userId !== session.user.id) return NextResponse.json({ error: "无权访问" }, { status: 403 });
    const src = rows[0];

    // 事务外读源数据（3 次简单查询），事务内纯写入
    const srcChapters = await db
      .select()
      .from(comicChapters)
      .where(eq(comicChapters.comicId, comicId))
      .orderBy(comicChapters.chapterNumber);
    const chapterIds = srcChapters.map((c) => c.id);
    const srcPanels = chapterIds.length
      ? await db
          .select()
          .from(comicPanels)
          .where(inArray(comicPanels.chapterId, chapterIds))
          .orderBy(comicPanels.panelNumber)
      : [];
    const srcChars = await db
      .select()
      .from(comicCharacters)
      .where(eq(comicCharacters.comicId, comicId))
      .orderBy(comicCharacters.createdAt);

    const newId = uuidv4();
    // 任一 insert 失败整体回滚
    await db.transaction(async (tx) => {
      await tx.insert(comics).values({
        id: newId,
        userId: session.user.id,
        title: `${src.title}（副本）`,
        description: src.description,
        source: src.source,
        sourceText: src.sourceText,
        genre: src.genre,
        style: src.style,
        layoutType: src.layoutType,
        // 原作脚本还在生成中时，副本只是一份壳，落为草稿避免永远卡在"生成中"
        status: src.status === "generating" ? "draft" : src.status,
        chapterCount: src.chapterCount,
        coverUrl: src.coverUrl,
        shareToken: uuidv4().replace(/-/g, "").slice(0, 12),
        shareCount: 0,
      });

      for (const c of srcChars) {
        await tx.insert(comicCharacters).values({
          id: uuidv4(),
          comicId: newId,
          name: c.name,
          role: c.role,
          gender: c.gender,
          age: c.age,
          appearance: c.appearance,
          personality: c.personality,
          referenceImageUrl: c.referenceImageUrl, // 复用参考图
        });
      }

      // 章节 id 旧→新重映射（panels 无 comicId 直连，须挂到新 chapterId）
      const chapterIdMap: Record<string, string> = {};
      for (const ch of srcChapters) {
        const nid = uuidv4();
        chapterIdMap[ch.id] = nid;
        await tx.insert(comicChapters).values({
          id: nid,
          comicId: newId,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          scriptContent: ch.scriptContent,
          status: ch.status,
        });
      }

      for (const p of srcPanels) {
        await tx.insert(comicPanels).values({
          id: uuidv4(),
          chapterId: chapterIdMap[p.chapterId],
          panelNumber: p.panelNumber,
          sceneDesc: p.sceneDesc,
          characters: p.characters,
          dialogue: p.dialogue,
          narration: p.narration,
          bubbleSide: p.bubbleSide,
          imagePrompt: p.imagePrompt,
          imageUrl: p.imageUrl, // 复用已生成图片
          // 生成中卡死的格子重置为待生成，用户可重新生图
          status: p.status === "generating" ? "pending" : p.status,
          errorMessage: p.errorMessage,
          regenCount: 0,
        });
      }
    });

    log.info(`漫画复制成功: ${comicId} -> ${newId}`);
    return NextResponse.json({ ok: true, comicId: newId });
  } catch (err: any) {
    log.error("POST copy comic failed", err);
    return NextResponse.json({ error: err?.message || "复制失败" }, { status: 500 });
  }
}
