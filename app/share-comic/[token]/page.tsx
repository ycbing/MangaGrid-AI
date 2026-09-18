"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Loader2, Eye, Share2, ChevronUp } from "lucide-react";
import PanelView from "@/components/comic/panel-view";

interface ComicData {
  id: string;
  title: string;
  description: string | null;
  style: string | null;
  layoutType: string | null;
  shareCount: number | null;
  createdAt: string;
}

interface PanelData {
  id: string;
  panelNumber: number;
  sceneDesc: string;
  dialogue: string | null;
  narration: string | null;
  bubbleSide: string | null;
  imageUrl: string | null;
  status?: string;
}

interface ChapterData {
  id: string;
  chapterNumber: number;
  title: string | null;
  panels: PanelData[];
}

export default function ShareComicPage() {
  const { token } = useParams<{ token: string }>();
  const [comic, setComic] = useState<ComicData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    fetch(`/api/share-comic/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && d.comic) {
          setComic(d.comic);
          setChapters(d.chapters || []);
        } else {
          setError(d.error || "加载失败");
        }
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, [token]);

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

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: comic?.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => alert("链接已复制"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error || !comic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-900 text-gray-300">
        <p>{error || "漫画不存在"}</p>
        <Link href="/" className="text-violet-400">去创作你的漫画 →</Link>
      </div>
    );
  }

  const allPanels = chapters.flatMap((c) => c.panels);
  const isStrip = comic.layoutType !== "page";

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="sticky top-0 z-20 bg-black/70 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="w-5 h-5 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-white font-semibold truncate text-sm">{comic.title}</h1>
              <p className="text-gray-400 text-xs">{chapters[0]?.title || "第一话"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-gray-500 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {(comic.shareCount || 0) + 1}
            </span>
            <button
              onClick={share}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition"
            >
              <Share2 className="w-3.5 h-3.5" /> 分享
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-2xl mx-auto ${isStrip ? "" : "grid grid-cols-1 sm:grid-cols-2 gap-2 p-4"}`}>
        {allPanels.length === 0 ? (
          <div className="text-center py-32 text-gray-400">本话还没有内容</div>
        ) : (
          allPanels.map((p) => (
            <PanelView key={p.id} panel={p} img={toImgUrl(p.imageUrl)} />
          ))
        )}
      </main>

      <footer className="text-center py-8 text-gray-500 text-xs">
        — 由 漫格 MangaGrid AI 创作 · 用 AI 把你的小说变成漫画 →
      </footer>

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