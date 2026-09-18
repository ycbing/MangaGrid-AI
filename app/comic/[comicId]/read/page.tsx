"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2, ChevronUp, List } from "lucide-react";
import { toast } from "sonner";
import PanelView from "@/components/comic/panel-view";

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
  const [activeChapter, setActiveChapter] = useState(0);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);

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

  // 滚动监听：显示/隐藏返回顶部
  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const validChapters = chapters
    .map((c) => ({ ...c, panels: c.panels.filter((p) => p.status === "done" && p.imageUrl) }))
    .filter((c) => c.panels.length > 0);

  const chapter = validChapters[Math.min(activeChapter, validChapters.length - 1)];
  const panels = chapter?.panels || [];
  const isStrip = comic.layoutType !== "page";

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 顶栏 */}
      <header className="sticky top-0 z-20 bg-black/70 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/comic/${comicId}`} className="text-gray-400 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <BookOpen className="w-5 h-5 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-white font-semibold truncate text-sm">{comic.title}</h1>
              <p className="text-gray-400 text-xs truncate">{chapter?.title || "第一话"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400">{panels.length} 格</span>
            {validChapters.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setChapterMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition"
                >
                  <List className="w-3.5 h-3.5" />
                  第 {chapter?.chapterNumber || 1} 话
                </button>
                {chapterMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setChapterMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-gray-800 border border-white/10 shadow-2xl py-1.5 z-20 max-h-72 overflow-y-auto">
                      {validChapters.map((c, i) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActiveChapter(i);
                            setChapterMenuOpen(false);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition ${
                            i === activeChapter
                              ? "bg-violet-600/30 text-violet-300"
                              : "text-gray-300 hover:bg-white/5"
                          }`}
                        >
                          第 {c.chapterNumber} 话
                          <span className="block text-[11px] text-gray-500 truncate">{c.title}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 正文 */}
      <main className={`max-w-2xl mx-auto ${isStrip ? "pt-0" : "grid grid-cols-1 sm:grid-cols-2 gap-2 p-4"}`}>
        {panels.length === 0 ? (
          <div className="text-center py-32 text-gray-400">
            <p className="mb-3">还没有完成的分镜图</p>
            <Link href={`/comic/${comicId}`} className="text-violet-400 underline">
              去生成 →
            </Link>
          </div>
        ) : (
          panels.map((p) => <PanelView key={p.id} panel={p} img={toImgUrl(p.imageUrl)} />)
        )}
      </main>

      {/* 下一页 / 章节尾 */}
      {panels.length > 0 && validChapters.length > 1 && activeChapter < validChapters.length - 1 && (
        <div className="max-w-2xl mx-auto px-4 pb-8 pt-6 flex justify-center">
          <button
            onClick={() => {
              setActiveChapter(activeChapter + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="px-8 py-3 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition"
          >
            下一话 →
          </button>
        </div>
      )}

      <footer className="text-center py-8 text-gray-500 text-xs">— 漫格 MangaGrid · 未完待续 —</footer>

      {/* 返回顶部 */}
      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-900/40 flex items-center justify-center hover:bg-violet-700 transition"
          aria-label="返回顶部"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}