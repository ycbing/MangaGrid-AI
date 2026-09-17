"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Panel {
  id: string;
  panelNumber: number;
  sceneDesc: string;
  dialogue: string | null;
  narration: string | null;
  bubbleSide: string | null;
  imageUrl: string | null;
  status: string;
}

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string | null;
  panels: Panel[];
}

interface Comic {
  id: string;
  title: string;
  style: string | null;
  layoutType: string | null;
}

export default function ComicReaderPage({ params }: { params: Promise<{ comicId: string }> }) {
  const { comicId } = use(params);
  const [comic, setComic] = useState<Comic | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/comics/${comicId}`);
      const d = await r.json();
      if (d.comic) {
        setComic(d.comic);
        setChapters(d.chapters || []);
      } else {
        toast.error(d.error || "加载失败");
      }
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [comicId]);

  useEffect(() => {
    load();
  }, [load]);

  const toImgUrl = (p: string | null) => {
    if (!p) return null;
    if (p.includes(".cos.")) {
      try {
        return `/api/uploads/cos/${encodeURIComponent(new URL(p).pathname.slice(1))}`;
      } catch {
        return p;
      }
    }
    return p;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-900 text-gray-300">
        <p>作品不存在</p>
        <Link href="/dashboard" className="text-violet-400">返回工作台</Link>
      </div>
    );
  }

  const allPanels = chapters.flatMap((c) => c.panels).filter((p) => p.status === "done" && p.imageUrl);
  const isStrip = comic.layoutType !== "page";

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 顶栏 */}
      <header className="sticky top-0 z-20 bg-black/70 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/comic/${comicId}`} className="text-gray-400 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <BookOpen className="w-5 h-5 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-white font-semibold truncate text-sm">{comic.title}</h1>
              <p className="text-gray-400 text-xs">{chapters[0]?.title || "第一话"}</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 shrink-0">{allPanels.length} 格</span>
        </div>
      </header>

      {/* 正文 */}
      <main className={`max-w-2xl mx-auto ${isStrip ? "" : "grid grid-cols-1 sm:grid-cols-2 gap-2 p-4"}`}>
        {allPanels.length === 0 ? (
          <div className="text-center py-32 text-gray-400">
            <p className="mb-3">还没有完成的分镜图</p>
            <Link href={`/comic/${comicId}`} className="text-violet-400 underline">
              去生成 →
            </Link>
          </div>
        ) : (
          allPanels.map((p) => <PanelView key={p.id} panel={p} img={toImgUrl(p.imageUrl)} />)
        )}
      </main>

      <footer className="text-center py-8 text-gray-500 text-xs">— 漫格 MangaGrid · 未完待续 —</footer>
    </div>
  );
}

/** 单格渲染：图片 + 对话气泡 + 旁白（图字分离） */
function PanelView({ panel, img }: { panel: Panel; img: string | null }) {
  const side = panel.bubbleSide || "bottom";
  const dialogue = panel.dialogue?.trim();
  const narration = panel.narration?.trim();

  return (
    <div className="relative w-full bg-black select-none">
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={`P${panel.panelNumber}`} className="w-full h-auto block" draggable={false} />
      )}

      {/* 旁白：顶部居中，仿漫画旁白框 */}
      {narration && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 max-w-[80%]">
          <div className="bg-black/75 text-white text-[13px] leading-snug px-3.5 py-1.5 rounded-lg shadow-md text-center border border-white/20">
            {narration}
          </div>
        </div>
      )}

      {/* 台词气泡：根据 bubbleSide 定位 */}
      {dialogue && (
        <div
          className={`absolute max-w-[65%] ${
            side === "left"
              ? "left-2.5 top-1/2 -translate-y-1/2"
              : side === "right"
              ? "right-2.5 top-1/2 -translate-y-1/2"
              : side === "top"
              ? "top-10 left-1/2 -translate-x-1/2"
              : "bottom-2.5 left-1/2 -translate-x-1/2"
          }`}
        >
          <div className={`relative bg-white text-gray-900 text-sm leading-snug px-3.5 py-2 rounded-2xl shadow-lg border-2 border-gray-800 ${side === "left" || side === "right" ? "" : "text-center"}`}>
            {dialogue}
            {/* 气泡尾巴 */}
            <span
              className={`absolute w-3 h-3 bg-white border-gray-800 rotate-45 ${
                side === "left"
                  ? "-right-[7px] top-1/2 -translate-y-1/2 border-r-2 border-t-2"
                  : side === "right"
                  ? "-left-[7px] top-1/2 -translate-y-1/2 border-l-2 border-b-2"
                  : side === "top"
                  ? "-bottom-[7px] left-1/2 -translate-x-1/2 border-b-2 border-r-2"
                  : "-top-[7px] left-1/2 -translate-x-1/2 border-t-2 border-l-2"
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}