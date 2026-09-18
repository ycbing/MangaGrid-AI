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
  Pencil,
  ArrowUp,
  ArrowDown,
  Save,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [pollActive, setPollActive] = useState(false);
  const [pollKind, setPollKind] = useState<"chars" | "panels" | null>(null);
  const pollStartRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/comics/${comicId}`);
      const d = await r.json();
      if (d.comic) {
        setComic(d.comic);
        setCharacters(d.characters || []);
        setChapters(d.chapters || []);
        return d;
      } else {
        toast.error(d.error || "加载失败");
      }
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
    return null;
  }, [comicId]);

  useEffect(() => {
    load();
  }, [load]);

  const stopPolling = useCallback(() => {
    setPollActive(false);
    setPollKind(null);
  }, []);

  // 异步任务轮询：POST 立即返回后按类型轮询，任务完成(done/failed)或超时自动停止
  useEffect(() => {
    if (!pollActive || !pollKind) return;
    const CHAR_TIMEOUT = 150000;
    const t = setInterval(async () => {
      const d = await load();
      if (!d) return;
      if (pollKind === "panels") {
        const panels = ((d.chapters as any[]) || []).flatMap((c: any) => c.panels);
        const stillBusy = panels.some((p: any) => ["generating", "pending", "failed"].includes(p.status));
        if (!stillBusy) {
          toast.success("全部分格生图完成");
          stopPolling();
        }
      } else if (pollKind === "chars") {
        const chars = d.characters || [];
        const allLocked = chars.length > 0 && chars.every((c: any) => c.referenceImageUrl);
        if (allLocked) {
          toast.success("角色参考图已全部锁定");
          stopPolling();
        } else if (Date.now() - pollStartRef.current > CHAR_TIMEOUT) {
          stopPolling();
        }
      }
    }, 3000);
    return () => clearInterval(t);
  }, [pollActive, pollKind, load, stopPolling]);

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
      if (r.ok && d.started) {
        toast.success(d.message || "已开始生成角色参考图");
        pollStartRef.current = Date.now();
        setPollKind("chars");
        setPollActive(true);
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
      if (r.ok && d.started) {
        toast.success(d.message || "已开始生成分格");
        pollStartRef.current = Date.now();
        setPollKind("panels");
        setPollActive(true);
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
      if (r.ok && d.started) {
        toast.success(d.message || "已开始重新生成");
        pollStartRef.current = Date.now();
        setPollKind("panels");
        setPollActive(true);
        await load();
      } else {
        toast.error(d.error || "重试失败");
      }
    } catch {
      toast.error("重试失败");
    } finally {
      setRetryingPanel(null);
    }
  };

  const allPanels = chapters.flatMap((c) => c.panels);
  const doneCount = allPanels.filter((p) => p.status === "done").length;
  const pendingCount = allPanels.filter((p) => p.status === "pending" || p.status === "failed").length;
  const failedCount = allPanels.filter((p) => p.status === "failed").length;
  const charDone = characters.filter((c) => c.referenceImageUrl).length;

  // ---- 分格编辑状态 ----
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [editForm, setEditForm] = useState({ sceneDesc: "", dialogue: "", narration: "", bubbleSide: "bottom" });
  const [editing, setEditing] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [continueOpen, setContinueOpen] = useState(false);
  const [continueText, setContinueText] = useState("");
  const [continuing, setContinuing] = useState(false);

  const openEdit = (p: Panel) => {
    setEditPanel(p);
    setEditForm({
      sceneDesc: p.sceneDesc || "",
      dialogue: p.dialogue || "",
      narration: p.narration || "",
      bubbleSide: p.bubbleSide || "bottom",
    });
  };

  const saveEdit = async () => {
    if (!editPanel) return;
    setEditing(true);
    try {
      const r = await fetch(`/api/comics/${comicId}/panels/${editPanel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        toast.success("分格已更新");
        setEditPanel(null);
        await load();
      } else {
        toast.error(d.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setEditing(false);
    }
  };

  // 章节内上移/下移一格
  const movePanel = async (ch: Chapter, panelId: string, dir: -1 | 1) => {
    if (reordering) return;
    const idx = ch.panels.findIndex((p) => p.id === panelId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= ch.panels.length) return;
    const ids = ch.panels.map((p) => p.id);
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    setReordering(true);
    try {
      const r = await fetch(`/api/comics/${comicId}/panels/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: ch.id, panelIds: ids }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        toast.success("顺序已更新");
        await load();
      } else {
        toast.error(d.error || "重排失败");
      }
    } catch {
      toast.error("重排失败");
    } finally {
      setReordering(false);
    }
  };

  const doContinue = async () => {
    setContinuing(true);
    try {
      const r = await fetch(`/api/comics/${comicId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ continuation: continueText.trim() || undefined }),
      });
      const d = await r.json();
      if (r.ok && d.chapterId) {
        toast.success(`第 ${d.chapterNumber} 话《${d.title}》已生成（${d.panelCount} 格）`);
        setContinueOpen(false);
        setContinueText("");
        await load();
      } else {
        toast.error(d.error || "续写失败");
        if (d.code === "INSUFFICIENT_CREDITS") router.push("/settings");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setContinuing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">作品不存在或已删除</p>
        <button onClick={() => router.push("/dashboard")} className="text-violet-600">
          返回工作台
        </button>
      </div>
    );
  }

  const cover = toImgUrl(comic.coverUrl);

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-20 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-800 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-md shadow-violet-200 shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
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
                disabled={genPanelsLoading || pollActive || pendingCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 hover:-translate-y-0.5 disabled:opacity-60 transition-all shadow-md shadow-violet-200"
              >
                {genPanelsLoading || (pollActive && pollKind === "panels") ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                生成全部分格（{pendingCount} 张 · {pendingCount} 积分）
              </button>
            )}
            <button
              onClick={() => setContinueOpen(true)}
              disabled={characters.length === 0}
              title={characters.length === 0 ? "请先完成第一话并锁定角色" : "为这部作品续写下一话（消耗 2 积分）"}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:bg-violet-50 transition"
            >
              <Plus className="w-4 h-4" /> 续写下一话
            </button>
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
        <section className="bg-white rounded-2xl border border-violet-100/70 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-violet-600" /> 角色卡
              <span className="text-xs font-normal text-gray-400">锁定形象 → 跨格一致</span>
            </h2>
            <button
              onClick={genCharacters}
              disabled={genCharsLoading || characters.length === 0 || (charDone === characters.length && characters.length > 0) || (pollActive && pollKind === "chars")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {genCharsLoading || (pollActive && pollKind === "chars") ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
                  <div key={c.id} className="flex gap-3 rounded-xl border bg-gray-50/50 p-3 hover:shadow-md hover:-translate-y-0.5 hover:border-violet-200 transition-all">
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

        {/* 分镜 */}
        <section className="bg-white rounded-2xl border border-violet-100/70 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-violet-600" /> 分镜格子
              <span className="text-xs font-normal text-gray-400">每格 = 一张漫画图 + 对话气泡</span>
            </h2>
            {failedCount > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                {failedCount} 格失败，可单独重试
              </span>
            )}
          </div>

          {allPanels.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">暂无分格，请重新生成脚本</p>
          ) : (
            <div className="space-y-6">
              {chapters.map((ch) => {
                const chPanels = ch.panels;
                if (chPanels.length === 0) return null;
                const chDone = chPanels.filter((p) => p.status === "done").length;
                return (
                  <div key={ch.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        第 {ch.chapterNumber} 话{ch.title ? ` · ${ch.title}` : ""}
                      </span>
                      <span className="text-xs text-gray-400">
                        {chDone}/{chPanels.length} 格
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden max-w-[140px]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all"
                          style={{ width: `${chPanels.length ? Math.round((chDone / chPanels.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {chPanels.map((p, pIdx) => {
                        const img = toImgUrl(p.imageUrl);
                        const isBusy = p.status === "generating";
                        const isFailed = p.status === "failed";
                        const isDone = p.status === "done" && img;
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
                              {isDone && (
                                <>
                                  <button
                                    onClick={() => retryPanel(p.id)}
                                    disabled={retryingPanel === p.id}
                                    title="重新生成此格"
                                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded hover:bg-black/80"
                                  >
                                    {retryingPanel === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    换一张
                                  </button>
                                  <span className="absolute bottom-1.5 right-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 bg-white rounded-full" />
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="p-2">
                              <div className="flex items-center gap-1 mb-1.5">
                                <button
                                  onClick={() => openEdit(p)}
                                  className="flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-md bg-violet-50 text-violet-600 hover:bg-violet-100 transition"
                                  title="编辑此格"
                                >
                                  <Pencil className="w-3 h-3" /> 编辑
                                </button>
                                <button
                                  onClick={() => movePanel(ch, p.id, -1)}
                                  disabled={reordering || pIdx === 0}
                                  className="p-1 rounded-md text-gray-400 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition"
                                  title="上移一格"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => movePanel(ch, p.id, 1)}
                                  disabled={reordering || pIdx === chPanels.length - 1}
                                  className="p-1 rounded-md text-gray-400 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition"
                                  title="下移一格"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[11px] text-gray-600 line-clamp-2">{p.sceneDesc}</p>
                              <div className="flex items-start gap-1 mt-1 text-[10px]">
                                {(p.dialogue || p.narration) && (
                                  <MessageCircle className="w-3 h-3 text-violet-400 mt-0.5 shrink-0" />
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

      {/* 分格编辑弹窗 */}
      <Dialog open={!!editPanel} onOpenChange={(o) => !o && setEditPanel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑分格</DialogTitle>
            <DialogDescription>
              修改台词 / 旁白 / 画面描述 / 气泡方位。改完保存后如需新图，请在工作台点"换一张"重新生成。
            </DialogDescription>
          </DialogHeader>
          {editPanel && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">画面描述（场景）</label>
                <Textarea
                  value={editForm.sceneDesc}
                  onChange={(e) => setEditForm((f) => ({ ...f, sceneDesc: e.target.value }))}
                  rows={3}
                  placeholder="该格的画面内容，将作为生图提示词的一部分"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">台词（对话气泡）</label>
                <Textarea
                  value={editForm.dialogue}
                  onChange={(e) => setEditForm((f) => ({ ...f, dialogue: e.target.value }))}
                  rows={2}
                  placeholder="角色说的对白"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">旁白</label>
                <Textarea
                  value={editForm.narration}
                  onChange={(e) => setEditForm((f) => ({ ...f, narration: e.target.value }))}
                  rows={2}
                  placeholder="旁白 / 描述性文字"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">气泡方位</label>
                <Select
                  value={editForm.bubbleSide}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, bubbleSide: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择气泡方位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">左侧</SelectItem>
                    <SelectItem value="right">右侧</SelectItem>
                    <SelectItem value="top">上方</SelectItem>
                    <SelectItem value="bottom">下方</SelectItem>
                    <SelectItem value="center">居中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                取消
              </button>
            </DialogClose>
            <button
              onClick={saveEdit}
              disabled={editing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 续写下一话弹窗 */}
      <Dialog open={continueOpen} onOpenChange={(o) => !o && setContinueOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>续写下一话</DialogTitle>
            <DialogDescription>
              复用本作品已有角色卡，AI 为它生成下一话脚本（约 20 格）。可选填后续剧情要点，留空则基于上文自动延续。消耗 2 积分。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium">后续剧情（可选）</label>
            <Textarea
              value={continueText}
              onChange={(e) => setContinueText(e.target.value)}
              rows={4}
              placeholder="例如：主角发现镜中器灵的真正身世与千年恩怨…（留空则基于已有上文自动续写）"
            />
            <p className="text-xs text-gray-400">
              当前已有 {characters.length} 位角色将被自动沿用，新登场的角色会补充进角色卡。
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                取消
              </button>
            </DialogClose>
            <button
              onClick={doContinue}
              disabled={continuing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {continuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              续写下一话（2 积分）
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}