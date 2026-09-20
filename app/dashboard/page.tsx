"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Sparkles, Search, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ComicCard, { type Comic } from "@/components/dashboard/comic-card";

const GENRE_ZH: Record<string, string> = {
  fantasy: "玄幻",
  urban: "都市",
  ancient: "古风",
  mystery: "悬疑",
  romance: "恋爱",
  scifi: "科幻",
};

const STYLE_OPTIONS = [
  { id: "manhua", name: "国漫厚涂" },
  { id: "manga", name: "日漫" },
  { id: "ink", name: "水墨国风" },
  { id: "watercolor", name: "水彩" },
  { id: "cyberpunk", name: "赛博朋克" },
  { id: "cartoon", name: "Q版卡通" },
];

interface EditForm {
  title: string;
  description: string;
  genre: string;
  style: string;
  layoutType: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Comic | null>(null);
  const [editTarget, setEditTarget] = useState<Comic | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort !== "createdAt") params.set("sort", sort);
    const qs = params.toString();
    try {
      const r = await fetch(`/api/comics${qs ? `?${qs}` : ""}`);
      const d = await r.json();
      if (d.comics) setComics(d.comics);
      else if (d.error) toast.error(d.error);
    } catch {
      toast.error("加载失败");
    }
  }, [q, sort]);

  useEffect(() => {
    // 搜索输入防抖；切换排序立即刷新
    const t = setTimeout(() => {
      load().finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      const r = await fetch(`/api/comics/${deleteTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.ok) {
        toast.success(`已删除《${deleteTarget.title}》`);
        await load();
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

  const copyComic = async (c: Comic) => {
    if (copyingId) return;
    setCopyingId(c.id);
    try {
      const r = await fetch(`/api/comics/${c.id}/copy`, { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        toast.success(`已复制《${c.title}》`);
        await load();
      } else {
        toast.error(d.error || "复制失败");
      }
    } catch {
      toast.error("复制失败");
    } finally {
      setCopyingId(null);
    }
  };

  const openEdit = (c: Comic) => {
    setEditTarget(c);
    setEditForm({
      title: c.title,
      description: c.description || "",
      genre: c.genre || "fantasy",
      style: c.style || "manhua",
      layoutType: c.layoutType || "strip",
    });
  };

  const saveEdit = async () => {
    if (!editTarget || !editForm || !editForm.title.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/comics/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          genre: editForm.genre,
          style: editForm.style,
          layoutType: editForm.layoutType,
        }),
      });
      const d = await r.json();
      if (d.comic) {
        toast.success("已保存");
        setEditTarget(null);
        setEditForm(null);
        await load();
      } else {
        toast.error(d.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
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

        {/* 搜索 / 排序工具栏 */}
        {!loading && (comics.length > 0 || q) && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索标题或简介…"
                className="pl-9 bg-white"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full sm:w-44 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">最近创建</SelectItem>
                <SelectItem value="updatedAt">最近更新</SelectItem>
                <SelectItem value="title">标题 A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : comics.length === 0 ? (
          q ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-violet-200/70 shadow-sm">
              <Search className="w-12 h-12 text-violet-200 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">未找到与“{q}”相关的作品</h2>
              <p className="text-gray-500 mb-6">换个关键词试试，或清除搜索查看全部作品</p>
              <button
                onClick={() => setQ("")}
                className="text-violet-600 font-medium hover:underline"
              >
                清除搜索
              </button>
            </div>
          ) : (
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
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {comics.map((c) => (
              <ComicCard
                key={c.id}
                comic={c}
                copying={copyingId === c.id}
                onDelete={setDeleteTarget}
                onEdit={openEdit}
                onCopy={copyComic}
              />
            ))}
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
              onClick={confirmDelete}
              disabled={deleting === deleteTarget?.id}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {deleting === deleteTarget?.id && <Loader2 className="w-4 h-4 animate-spin" />}
              删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑作品弹窗 */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && (setEditTarget(null), setEditForm(null))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑作品</DialogTitle>
            <DialogDescription>修改作品信息，画风与版式仅影响后续新生成的画面</DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">标题</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="作品标题"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">简介</Label>
                <Textarea
                  id="edit-desc"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="一句话介绍这部作品（可选）"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>题材</Label>
                  <Select value={editForm.genre} onValueChange={(v) => setEditForm({ ...editForm, genre: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GENRE_ZH).map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>画风</Label>
                  <Select value={editForm.style} onValueChange={(v) => setEditForm({ ...editForm, style: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_OPTIONS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>版式</Label>
                  <Select
                    value={editForm.layoutType}
                    onValueChange={(v) => setEditForm({ ...editForm, layoutType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strip">条漫</SelectItem>
                      <SelectItem value="page">页漫</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              disabled={saving || !editForm?.title.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              保存
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
