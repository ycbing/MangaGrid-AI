import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { exportComicChapterPdf } from "@/lib/ai/comic-pdf-export";
import { createLogger } from "@/lib/logger";

const log = createLogger("comic-export-pdf-api");

// GET /api/comics/[comicId]/export-pdf?chapter=N — 导出当前话的逐格拼版 PDF
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ comicId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("未登录", { status: 401 });
    }

    const { comicId } = await params;
    const url = new URL(_request.url);
    const chapterNumber = Math.max(1, Number(url.searchParams.get("chapter")) || 1);

    const result = await exportComicChapterPdf(comicId, chapterNumber, session.user.id);
    if (!result) {
      // 作品不存在 / 无权访问 / 章节或分格缺失，统一 404
      return new Response("作品或章节不存在，或没有已生成的分格图", { status: 404 });
    }

    const fileName = encodeURIComponent(
      `${result.title}-第${result.chapterNumber}话.pdf`
    );
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      "Content-Length": String(result.buffer.length),
      "Cache-Control": "no-store",
    });

    log.info(`导出 PDF: ${comicId} 第${result.chapterNumber}话 ${result.panelCount}格`);
    return new Response(new Uint8Array(result.buffer), { status: 200, headers });
  } catch (err: any) {
    log.error("GET /api/comics/[comicId]/export-pdf failed", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      str: String(err),
    });
    return new Response(err?.message || "导出失败", { status: 500 });
  }
}
