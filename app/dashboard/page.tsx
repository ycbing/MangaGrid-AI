"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  BookOpen,
  Sparkles,
  Trash2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

interface Comic {
  id: string;
  title: string;
  description: string | null;
  style: string | null;
  layoutType: string | null;
  status: string;
  coverUrl: string | null;
  createdAt: string;
  shareToken: string | null;
  chapterCount: number | null;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft: { text: "草稿", cls: "bg-gray-100 text-gray-600" },
  generating: { text: "脚本生成中…", cls: "bg-blue-50 text-blue-600" },
  script_ready: { text: "脚本完成", cls: "bg-amber-50 text-amber-600" },
  chars_ready: { text: "角色已锁定", cls: "bg-purple-50 text-purple-600" },
  panels_ready: { text: "分镜完成", cls: "bg-green-50 text-green-600" },
  panels_partial: { text: "部分完成", cls: "bg-orange-50 text-orange-600" },
  exported: { text: "已导出", cls: "bg-emerald-50 text-emerald-600" },
  error: { text: "生成失败", cls: "bg-red-50 text-red-600" },
};

const STYLE_ZH: Record<string, string> = {
  manga: "日漫",
  manhua: "国漫",
  ink: "水墨",
  watercolor: "水彩",
  cyberpunk: "赛博朋克",
  cartoon: "Q版",
};

export default function DashboardPage() {
  const router = useRouter();
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Comic | null>(null);

  useEffect(() => {
    fetch("/api/comics")
      .then((r) => r.json())
      .then((d) => {
        if (d.comics) setComics(d.comics);
        else if (d.error) toast.error(d.error);
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const toImgUrl = (p: string | null) => {
    if (!p) return null;
    if (p.includes(".cos.")) {
      try {
        const u = new URL(p);
        return `/api/uploads/cos/${encodeURIComponent(u.pathname.slice(1))}`;
      } catch {
        return p;
      }
    }
    if (p.startsWith("/api/") || p.startsWith("/uploads/")) return p;
    if (p.startsWith("http")) return p;
    return p;
  };

  const confirmDelete = async (id: string, title: string) => {
    if (!deleteTarget || deleteTarget.id !== id) return;
    setDeleting(id);
    try {
      const r = await fetch(`/api/comics/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.ok) {
        setComics((list) => list.filter((c) => c.id !== id));
        toast.success(`已删除《${title}》`);
      } else {
        toast.error(d.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-app">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-violet-100/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200 group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-[17px] tracking-tight">漫格 MangaGrid</div>
              <div className="text-[10px] text-violet-400 font-medium tracking-widest">AI COMIC STUDIO</div>
            </div>
          </Link>
          <button
            onClick={() => router.push("/comic/new")}
            className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200"
          >
            <Plus className="w-4 h-4" /> 新建漫画
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 animate-[fadeUp_.5s_ease]">
          <div>
            <h1 className="text-2xl font-bold">我的作品</h1>
            <p className="text-gray-500 text-sm mt-1">从网文到条漫，只需 5 分钟</p>
          </div>
          <div className="text-sm text-gray-500">{comics.length} 部作品</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : comics.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-violet-200/70 shadow-sm animate-[fadeUp_.5s_.05s_ease_both]">
            <Sparkles className="w-12 h-12 text-violet-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">还没有作品</h2>
            <p className="text-gray-500 mb-6">输入一个创意或粘贴小说章节，AI 帮你画出第一话</p>
            <button
              onClick={() => router.push("/comic/new")}
              className="btn-brand text-white px-6 py-3 rounded-xl font-medium hover:opacity-95 hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200"
            >
              开始创作 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {comics.map((c) => {
              const st = STATUS_LABEL[c.status] || STATUS_LABEL.draft;
              const cover = toImgUrl(c.coverUrl);
              return (
                <div
                  key={c.id}
                  className="group bg-white rounded-2xl border border-violet-100/70 overflow-hidden hover:shadow-xl hover:shadow-violet-100 hover:-translate-y-1 transition-all duration-300"
                >
                  <Link href={`/comic/${c.id}`} className="block relative aspect-[4/3] bg-gray-100">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
                        <BookOpen className="w-10 h-10 text-violet-200" />
                      </div>
                    )}
                    <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium ${st.cls}`}>
                      {st.text}
                    </span>
                    {c.layoutType === "strip" && (
                      <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs bg-black/60 text-white">
                        条漫
                      </span>
                    )}
                  </Link>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{c.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{STYLE_ZH[c.style || "manhua"] || c.style}</span>
                          <span>·</span>
                          <span>{c.chapterCount || 1} 话</span>
                          <span>·</span>
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="text-gray-300 hover:text-red-500 transition"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-3">
                      <Link
                        href={`/comic/${c.id}`}
                        className="flex items-center justify-center gap-1.5 w-full bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 hover:-translate-y-0.5 transition-all"
                      >
                        继续创作 <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>删除作品</DialogTitle>
            <DialogDescription>
              确定删除《{deleteTarget?.title}》吗？删除后不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                取消
              </button>
            </DialogClose>
            <button
              onClick={() => deleteTarget && confirmDelete(deleteTarget.id, deleteTarget.title)}
              disabled={deleting === deleteTarget?.id}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {deleting === deleteTarget?.id && <Loader2 className="w-4 h-4 animate-spin" />}
              删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
