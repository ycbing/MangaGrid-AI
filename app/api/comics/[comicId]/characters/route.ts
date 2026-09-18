import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, comicCharacters } from "@/lib/db/comic-schema";
import { eq } from "drizzle-orm";
import { generateImage, downloadImage } from "@/lib/ai/image-generator";
import { uploadFileToCos } from "@/lib/ai/cos-storage";
import { deductCredits } from "@/lib/credits";
import { createLogger } from "@/lib/logger";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

const log = createLogger("comic-chars-api");
const MOCK_IMAGES = process.env.MOCK_IMAGES === "1";

const STYLE_PROMPT: Record<string, string> = {
  manga: "日式漫画风格，黑白网点，清晰线条，美型人物",
  manhua: "国漫厚涂风格，彩色，光影丰富，精美插画",
  ink: "水墨国风风格，传统水墨渲染，留白构图",
  watercolor: "水彩风格，柔和晕染，清新治愈",
  cyberpunk: "赛博朋克风格，霓虹配色，高对比",
  cartoon: "Q版卡通风格，圆润可爱，夸张表情",
};

/** 后台异步角色参考图生成任务：逐角色写库，任务内兜底捕获，不抛未处理异常 */
async function runCharTask(
  opts: {
    userId: string;
    comicId: string;
    comicStatus: string | null;
    chars: any[];
    stylePrompt: string;
  }
) {
  const { userId, comicId, comicStatus, chars, stylePrompt } = opts;
  let done = 0;
  let failed = 0;

  try {
    const results: { id: string; name: string; referenceImageUrl: string | null; status: string }[] = [];

    const genOne = async (c: any) => {
      // 已生成过的跳过
      if (c.referenceImageUrl) {
        results.push({ id: c.id, name: c.name, referenceImageUrl: c.referenceImageUrl, status: "skipped" });
        return;
      }

      const prompt = `${c.appearance}。角色设定立绘，${stylePrompt}，半身像，正面朝向，居中构图，纯色简单背景，突出人物特征`;

      let imageUrl: string | null = null;
      try {
        if (MOCK_IMAGES) {
          imageUrl = `https://placehold.co/1024x1024/6C5CE7/white?text=${encodeURIComponent(c.name)}`;
        } else {
          const generated = await generateImage(prompt, "anime", "1024x1024" as any, {
            userId,
          });
          const tmpDir = await mkdtemp(path.join(tmpdir(), "manga-char-"));
          const localPath = path.join(tmpDir, `${c.id}.png`);
          await downloadImage(generated, localPath);
          const cosKey = `${comicId}/characters/${c.id}.png`;
          const cosUrl = await uploadFileToCos(localPath, cosKey);
          await rm(tmpDir, { recursive: true, force: true });
          imageUrl = cosUrl || generated;
        }

        await db
          .update(comicCharacters)
          .set({ referenceImageUrl: imageUrl })
          .where(eq(comicCharacters.id, c.id));

        await deductCredits(userId, "comicCharRef", 2, undefined, `角色参考图: ${c.name}`);
        results.push({ id: c.id, name: c.name, referenceImageUrl: imageUrl, status: "done" });
        done += 1;
      } catch (err: any) {
        log.error(`角色参考图生成失败: ${c.name}`, err);
        results.push({ id: c.id, name: c.name, referenceImageUrl: null, status: `failed: ${err.message}` });
        failed += 1;
      }
    };

    // 角色数量少（3-6），直接全量并发
    await Promise.all(chars.map(genOne));

    const status = failed === 0 ? (comicStatus === "panels_ready" ? "panels_ready" : "chars_ready") : comicStatus;
    await db.update(comics).set({ status, updatedAt: new Date() }).where(eq(comics.id, comicId));
    log.info(`角色参考图任务结束: total=${chars.length} done=${done} failed=${failed}`);
  } catch (err: any) {
    log.error("角色参考图后台任务异常", err);
  }
}

// POST /api/comics/[comicId]/characters — 为角色生成参考图（异步：立即返回 202，后台逐角色生成）
export async function POST(request: NextRequest, { params }: { params: Promise<{ comicId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { comicId } = await params;

  try {
    const comicRow = await db.select().from(comics).where(eq(comics.id, comicId)).limit(1);
    if (!comicRow.length) return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    if (comicRow[0].userId !== session.user.id) return NextResponse.json({ error: "无权访问" }, { status: 403 });

    const chars = await db.select().from(comicCharacters).where(eq(comicCharacters.comicId, comicId));
    if (!chars.length) return NextResponse.json({ error: "没有角色，请先生成脚本" }, { status: 400 });

    const stylePrompt = STYLE_PROMPT[comicRow[0].style || "manhua"] || STYLE_PROMPT.manhua;

    // 异步 fire-and-forget：立即返回，后台逐角色生成参考图，前端轮询进度
    void runCharTask({
      userId: session.user.id,
      comicId,
      comicStatus: comicRow[0].status,
      chars,
      stylePrompt,
    });

    return NextResponse.json(
      { started: true, pending: chars.length, message: `已开始生成 ${chars.length} 张角色参考图` },
      { status: 202 }
    );
  } catch (err: any) {
    log.error("characters API failed", err);
    return NextResponse.json({ error: err?.message || "生成角色参考图失败" }, { status: 500 });
  }
}
