"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  BookOpen,
  User,
  ImageIcon,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Character {
  id: string;
  name: string;
  role: string;
  gender: string | null;
  age: string | null;
  appearance: string;
  personality: string | null;
  referenceImageUrl: string | null;
}

interface Panel {
  id: string;
  panelNumber: number;
  sceneDesc: string;
  characters: string[] | null;
  dialogue: string | null;
  narration: string | null;
  bubbleSide: string | null;
  imageUrl: string | null;
  status: string;
  errorMessage: string | null;
}

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string | null;
  status: string;
  panels: Panel[];
}

interface Comic {
  id: string;
  title: string;
  status: string;
  style: string | null;
  layoutType: string | null;
  coverUrl: string | null;
}

const ROLE_ZH: Record<string, string> = { protagonist: "主角", supporting: "配角", villain: "反派" };

export default function ComicEditPage({ params }: { params: Promise<{ comicId: string }> }) {
  const { comicId } = use(params);
  const router = useRouter();

  const [comic, setComic] = useState<Comic | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  // 操作状态
  const [genCharsLoading, setGenCharsLoading] = useState(false);
  const [genPanelsLoading, setGenPanelsLoading] = useState(false);
  const [retryingPanel, setRetryingPanel] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/comics/${comicId}`);
      const d = await r.json();
      if (d.comic) {
        setComic(d.comic);
        setCharacters(d.characters || []);
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

  // 生成中轮询
  useEffect(() => {
    const isBusy = genCharsLoading || genPanelsLoading || retryingPanel;
    if (isBusy && !pollRef.current) {
      pollRef.current = setInterval(load, 3000);
    }
    if (!isBusy && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [genCharsLoading, genPanelsLoading, retryingPanel, load]);

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

  const genCharacters = async () => {
    setGenCharsLoading(true);
    try {
      const r = await fetch(`/api/comics/${comicId}/characters`, { method: "POST" });
      const d = await r.json();
      if (d.summary) {
        toast.success(`角色参考图完成：${d.summary.done}/${d.summary.total}`);
        await load();
      } else {
        toast.error(d.error || "生成失败");
      }
    } catch {
      toast.error("生成失败");
    } finally {
      setGenCharsLoading(false);
    }
  };

  const genPanels = async (panelIds?: string[]) => {
    setGenPanelsLoading(true);
    try {
      const r = await fetch(`/api/comics/${comicId}/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(panelIds ? { panelIds } : {}),
      });
      const d = await r.json();
      if (d.summary) {
        toast.success(`生图完成：${d.summary.done}/${d.summary.total}`);
        await load();
      } else {
        toast.error(d.error || "生成失败");
      }
    } catch {
      toast.error("生成失败");
    } finally {
      setGenPanelsLoading(false);
    }
  };

  const retryPanel = async (panelId: string) => {
    setRetryingPanel(panelId);
    try {
      const r = await fetch(`/api/comics/${comicId}/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelIds: [panelId] }),
      });
      const d = await r.json();
      if (d.summary) toast.success(`P${d.summary.total ? "" : ""}重新生成完成`);
      await load();
    } catch {
      toast.error("重试失败");
    } finally {
      setRetryingPanel(null);
    }
  };

  const allPanels = chapters.flatMap((c) => c.panels);
  const doneCount = allPanels.filter((p) => p.status === "done").length;
  const pendingCount = allPanels.filter((p) => p.status === "pending" || p.status === "failed").length;
  const charDone = characters.filter((c) => c.referenceImageUrl).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">作品不存在或已删除</p>
        <button onClick={() => router.push("/dashboard")} className="text-indigo-600">
          返回工作台
        </button>
      </div>
    );
  }

  const cover = toImgUrl(comic.coverUrl);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-800 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-bold truncate">{comic.title}</h1>
              <p className="text-xs text-gray-400">
                {allPanels.length} 格 · 已完成 {doneCount}/{allPanels.length} · 角色 {characters.length}（{charDone} 锁定）
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pendingCount > 0 && (
              <button
                onClick={() => genPanels()}
                disabled={genPanelsLoading || pendingCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                {genPanelsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                生成全部分格（{pendingCount} 张·{pendingCount} 积分）
              </button>
            )}
            <Link
              href={`/comic/${comicId}/read`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                doneCount > 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-200 text-gray-400 pointer-events-none"
              }`}
            >
              <Play className="w-4 h-4" /> 阅读
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 角色卡 */}
        <section className="bg-white rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-purple-600" /> 角色卡
              <span className="text-xs font-normal text-gray-400">锁定形象 → 跨格一致</span>
            </h2>
            <button
              onClick={genCharacters}
              disabled={genCharsLoading || characters.length === 0 || (charDone === characters.length && characters.length > 0)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {genCharsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {charDone === characters.length && characters.length > 0 ? "已全部锁定" : `生成参考图（${characters.length - charDone} 张）`}
            </button>
          </div>

          {characters.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">暂无角色，请重新生成脚本</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {characters.map((c) => {
                const refImg = toImgUrl(c.referenceImageUrl);
                return (
                  <div key={c.id} className="flex gap-3 rounded-xl border bg-gray-50/50 p-3">
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center">
                      {refImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={refImg} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">
                          {ROLE_ZH[c.role] || c.role}
                        </span>
                        {c.referenceImageUrl && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-3">{c.appearance}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 分格 */}
        <section className="bg-white rounded-2xl border p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ImageIcon className="w-4.5 h-4.5 text-indigo-600" /> 分镜格子
            <span className="text-xs font-normal text-gray-400">每格 = 一张漫画图 + 对话气泡</span>
          </h2>

          {allPanels.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">暂无分格，请重新生成脚本</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {allPanels.map((p) => {
                const img = toImgUrl(p.imageUrl);
                const isBusy = p.status === "generating";
                const isFailed = p.status === "failed";
                return (
                  <div
                    key={p.id}
                    className={`relative rounded-xl border overflow-hidden group ${
                      isFailed ? "border-red-200" : "border-gray-100"
                    }`}
                  >
                    <div className="aspect-[9/14] bg-gray-100 relative">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={`P${p.panelNumber}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1">
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-[10px]">待生成</span>
                        </div>
                      )}
                      {isBusy && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-xs gap-1.5">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          生成中…
                        </div>
                      )}
                      {isFailed && (
                        <div className="absolute inset-0 bg-red-50/90 flex flex-col items-center justify-center p-2 text-center">
                          <XCircle className="w-5 h-5 text-red-500 mb-1" />
                          <p className="text-[10px] text-red-600 line-clamp-2">{p.errorMessage || "失败"}</p>
                          <button
                            onClick={() => retryPanel(p.id)}
                            disabled={retryingPanel === p.id}
                            className="mt-1.5 text-[10px] px-2 py-1 bg-red-500 text-white rounded flex items-center gap-1 hover:bg-red-600"
                          >
                            {retryingPanel === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            重试
                          </button>
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        P{p.panelNumber}
                      </span>
                      {p.status === "done" && (
                        <span className="absolute top-1.5 right-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 bg-white rounded-full" />
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] text-gray-600 line-clamp-2">{p.sceneDesc}</p>
                      <div className="flex items-start gap-1 mt-1 text-[10px]">
                        {(p.dialogue || p.narration) && (
                          <MessageCircle className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                        )}
                        <p className="text-gray-500 line-clamp-1">
                          {p.dialogue || p.narration || "无台词"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {cover && (
          <div className="hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="cover" />
          </div>
        )}
      </main>
    </div>
  );
}