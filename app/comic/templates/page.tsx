"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Flame, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  COMIC_CREDIT_COSTS,
  GENRE_META,
  TEMPLATE_GRADIENTS,
} from "@/lib/constants";

interface Tpl {
  id: string;
  title: string;
  description: string;
  genre: string;
  style: string | null;
  layoutType: string | null;
  panelCount: number | null;
  emoji: string;
  grad: string;
  tags: string | null;
  useCount: number;
  sortOrder: number;
  createdAt: string;
}

export default function TemplateMarketPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Tpl[] | null>(null);
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [sort, setSort] = useState<"latest" | "hot">("latest");

  useEffect(() => {
    fetch("/api/templates")
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) setTemplates(d.templates || []);
        else throw new Error(d.error);
      })
      .catch(() => {
        toast.error("模板加载失败");
        setTemplates([]);
      });
  }, []);

  const list = useMemo(() => {
    if (!templates) return [];
    const filtered =
      genreFilter === "all" ? templates : templates.filter((t) => t.genre === genreFilter);
    const sorted = [...filtered];
    if (sort === "hot") sorted.sort((a, b) => b.useCount - a.useCount);
    return sorted;
  }, [templates, genreFilter, sort]);

  // 使用模板：同会话去重后 fire-and-forget 计数，不阻塞跳转
  const handleUseTemplate = (t: Tpl) => {
    const key = `mg_tpl_used_${t.id}`;
    let used = false;
    try {
      used = !!window.sessionStorage.getItem(key);
      window.sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage 不可用则不计数
    }
    if (!used) {
      fetch(`/api/templates/${t.id}/use`, { method: "POST" }).catch(() => {});
    }
    router.push(`/comic/new?template=${t.id}`);
  };

  const estCredits = (t: Tpl) => {
    const n = t.panelCount ?? 20;
    return COMIC_CREDIT_COSTS.comicScript + COMIC_CREDIT_COSTS.comicPanel * n;
  };

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-violet-100/60">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition">
            <ArrowLeft className="w-4 h-4" /> 返回
          </Link>
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200 group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-[17px] tracking-tight">漫格 MangaGrid</div>
              <div className="text-[10px] text-violet-400 font-medium tracking-widest">AI COMIC STUDIO</div>
            </div>
          </Link>
          <div className="w-14" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-7 animate-[fadeUp_.5s_ease]">
          <h1 className="text-3xl font-bold">
            模板市场 <span className="align-middle text-2xl">🛍️</span>
          </h1>
          <p className="text-gray-500 mt-2">挑一个热门创意，一键开始你的第一话</p>
        </div>

        {/* 筛选：题材 + 排序 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 animate-[fadeUp_.5s_.05s_ease_both]">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGenreFilter("all")}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                genreFilter === "all"
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"
              }`}
            >
              ✨ 全部
            </button>
            {Object.entries(GENRE_META).map(([id, g]) => (
              <button
                key={id}
                onClick={() => setGenreFilter(id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  genreFilter === id
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"
                }`}
              >
                {g.emoji} {g.name}
              </button>
            ))}
          </div>
          <div className="flex items-center bg-violet-50 p-0.5 rounded-lg shrink-0">
            <button
              onClick={() => setSort("latest")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                sort === "latest" ? "bg-white shadow text-violet-700" : "text-gray-500 hover:text-violet-600"
              }`}
            >
              最新
            </button>
            <button
              onClick={() => setSort("hot")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                sort === "hot" ? "bg-white shadow text-violet-700" : "text-gray-500 hover:text-violet-600"
              }`}
            >
              <Flame className="w-3 h-3" /> 最热
            </button>
          </div>
        </div>

        {/* 模板卡片网格 */}
        {templates === null ? (
          <div className="py-32 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-32 text-center text-gray-400">
            该题材暂无模板，去看看别的题材吧
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((t, i) => {
              const g = GENRE_META[t.genre];
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl border border-violet-100/70 overflow-hidden hover:shadow-xl hover:shadow-violet-100 hover:-translate-y-1 transition-all duration-300 animate-[fadeUp_.5s_ease_both]"
                  style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                >
                  <div
                    className={`h-28 bg-gradient-to-br ${
                      TEMPLATE_GRADIENTS[t.grad] ?? TEMPLATE_GRADIENTS.violet
                    } flex items-center justify-center relative`}
                  >
                    <span className="text-5xl">{t.emoji}</span>
                    {t.useCount > 0 && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] bg-white/80 text-violet-600 font-medium">
                        🔥 {t.useCount} 人用过
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{t.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-violet-50 text-violet-600">
                        {g ? `${g.emoji} ${g.name}` : t.genre}
                      </span>
                      {t.layoutType === "page" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-500">
                          页漫
                        </span>
                      )}
                    </div>
                    {t.tags && (
                      <div className="mt-1.5 text-[11px] text-gray-400">
                        {t.tags.split(",").filter(Boolean).join(" · ")}
                      </div>
                    )}
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2 min-h-[40px]">{t.description}</p>
                    <div className="mt-2 text-xs text-gray-400">
                      预计 {t.panelCount ?? 20} 格 · 约 {estCredits(t)} 积分
                    </div>
                    <button
                      onClick={() => handleUseTemplate(t)}
                      className="mt-3 flex items-center justify-center gap-1.5 w-full bg-gradient-to-r from-violet-600 to-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-95 hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200"
                    >
                      <Sparkles className="w-4 h-4" /> 使用此模板
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
