import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, comicChapters, comicCharacters, comicPanels } from "@/lib/db/comic-schema";
import { eq } from "drizzle-orm";
import { generateImage, downloadImage } from "@/lib/ai/image-generator";
import { uploadFileToCos } from "@/lib/ai/cos-storage";
import { deductCredits } from "@/lib/credits";
import { createLogger } from "@/lib/logger";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

const log = createLogger("comic-panels-api");
const MOCK_IMAGES = process.env.MOCK_IMAGES === "1";

const STYLE_PROMPT: Record<string, string> = {
  manga: "日式漫画风格，黑白为主，网点纹理，清晰线条，美型人物，漫画分格画面",
  manhua: "国漫厚涂风格，彩色，光影丰富，精美插画质感，漫画分格画面",
  ink: "水墨国风，传统水墨渲染，留白构图，意境感",
  watercolor: "水彩风格，柔和晕染，清新淡雅",
  cyberpunk: "赛博朋克漫画，霓虹配色，高对比，未来都市",
  cartoon: "Q版卡通，圆润可爱，夸张表情，儿童绘本风",
};

function buildPanelPrompt(
  panel: typeof comicPanels.$inferSelect,
  chars: any[],
  stylePrompt: string
): string {
  const parts: string[] = [];
  parts.push(panel.sceneDesc);
  // 注入出场角色外貌（一致性关键）
  const names: string[] = (panel.characters as string[]) || [];
  for (const n of names) {
    const c = chars.find((x) => x.name === n);
    if (c) parts.push(`${c.name}的形象：${c.appearance}`);
  }
  parts.push(stylePrompt);
  parts.push("漫画分镜构图，画面内不要出现任何文字");
  return parts.join("。");
}

/** 后台异步批量生图任务：逐格写库，失败单独标记，任务内兜底捕获，不抛未处理异常 */
async function runPanelTask(
  opts: {
    userId: string;
    comic: typeof comics.$inferSelect;
    chars: any[];
    targets: typeof comicPanels.$inferSelect[];
    stylePrompt: string;
    imageSize: string;
  }
) {
  const { userId, comic, chars, targets, stylePrompt, imageSize } = opts;
  let done = 0;
  let failed = 0;

  try {
    // 并发池：qwen 单图 ~50s，串行太慢；并发平衡速度与限流
    const CONCURRENCY = Math.min(Number(process.env.PANEL_CONCURRENCY) || 2, 6);

    const genOne = async (panel: any) => {
      // 标记生成中
      await db
        .update(comicPanels)
        .set({ status: "generating" })
        .where(eq(comicPanels.id, panel.id));

      try {
        const prompt = buildPanelPrompt(panel, chars, stylePrompt);
        let imageUrl: string | null = null;

        if (MOCK_IMAGES) {
          imageUrl = `https://placehold.co/720x1280/2d3436/white?text=${encodeURIComponent(
            `P${panel.panelNumber} ${(panel.dialogue || panel.narration || "").slice(0, 8)}`
          )}`;
        } else {
          const references = ((panel.characters as string[]) || [])
            .map((name: string) => chars.find((c) => c.name === name))
            .filter((c: any) => c?.referenceImageUrl)
            .map((c: any) => ({
              imageUrl: c.referenceImageUrl,
              type: "full_body" as const,
              characterName: c.name,
            }));

          const generated = await generateImage(prompt, comic.style || "manhua", imageSize as any, {
            characterReferences: references.length ? references : undefined,
            userId,
          });

          const tmpDir = await mkdtemp(path.join(tmpdir(), "manga-panel-"));
          const localPath = path.join(tmpDir, `${panel.id}.png`);
          await downloadImage(generated, localPath);
          const cosKey = `${comic.id}/panels/${panel.id}.png`;
          const cosUrl = await uploadFileToCos(localPath, cosKey);
          await rm(tmpDir, { recursive: true, force: true });
          imageUrl = cosUrl || generated;
        }

        await db
          .update(comicPanels)
          .set({ imageUrl, status: "done", errorMessage: null })
          .where(eq(comicPanels.id, panel.id));
        await deductCredits(userId, "comicPanel", 1, undefined, `分格生图 P${panel.panelNumber}`);
        done += 1;
      } catch (err: any) {
        log.error(`分格生图失败 P${panel.panelNumber}`, err);
        await db
          .update(comicPanels)
          .set({ status: "failed", errorMessage: err.message?.slice(0, 200) })
          .where(eq(comicPanels.id, panel.id));
        failed += 1;
      }
    };

    // 并发调度
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const batch = targets.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(genOne));
      log.info(`分格生图进度 ${Math.min(i + CONCURRENCY, targets.length)}/${targets.length}`, {
        done,
        failed,
      });
    }

    const newStatus =
      failed === 0 ? "panels_ready" : done > 0 ? "panels_partial" : comic.status;
    await db.update(comics).set({ status: newStatus, updatedAt: new Date() }).where(eq(comics.id, comic.id));
    log.info(`分格生图任务结束: total=${targets.length} done=${done} failed=${failed}`);
  } catch (err: any) {
    log.error("分格生图后台任务异常", err);
  }
}

// POST /api/comics/[comicId]/panels — 批量生成分格图（异步：立即返回 202，后台逐格生成）
// body: { panelIds?: string[] } 不传则生成所有 pending/failed 格子
export async function POST(request: NextRequest, { params }: { params: Promise<{ comicId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { comicId } = await params;

  try {
    const comicRow = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!comicRow.length) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (comicRow[0].userId !== session.user.id) return NextResponse.json({ error: "无权访问" }, { status: 403 });

    const chars = await db.select().from(comicCharacters).where(eq(comicCharacters.comicId, comicId));
    const chapters = await db.select().from(comicChapters).where(eq(comicChapters.comicId, comicId));
    let panels: typeof comicPanels.$inferSelect[] = [];
    for (const ch of chapters) {
      const list = await db
        .select()
        .from(comicPanels)
        .where(eq(comicPanels.chapterId, ch.id))
        .orderBy(comicPanels.panelNumber);
      panels.push(...list);
    }

    const body = await request.json().catch(() => ({}));
    const panelIds: string[] | undefined = body.panelIds;
    let targets = panels;
    if (Array.isArray(panelIds) && panelIds.length) {
      targets = panels.filter((p) => panelIds.includes(p.id));
    } else {
      targets = panels.filter((p) => p.status === "pending" || p.status === "failed");
    }

    if (!targets.length) {
      return NextResponse.json({ message: "没有待生成的格子" });
    }

    const stylePrompt = STYLE_PROMPT[comicRow[0].style || "manhua"] || STYLE_PROMPT.manhua;
    const isStrip = comicRow[0].layoutType !== "page";
    const imageSize = isStrip ? "720x1280" : "1024x1024";

    // 异步 fire-and-forget：立即返回，后台逐格生成并写库，前端轮询进度
    void runPanelTask({
      userId: session.user.id,
      comic: comicRow[0],
      chars,
      targets,
      stylePrompt,
      imageSize,
    });

    return NextResponse.json(
      { started: true, pending: targets.length, message: `已开始生成 ${targets.length} 格分镜` },
      { status: 202 }
    );
  } catch (err: any) {
    log.error("panels API failed", err);
    return NextResponse.json({ error: err?.message || "生成分格失败" }, { status: 500 });
  }
}
