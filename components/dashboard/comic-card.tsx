"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { COMIC_CREDIT_COSTS } from "@/lib/constants";

export interface Comic {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  style: string | null;
  layoutType: string | null;
  status: string;
  coverUrl: string | null;
  createdAt: string;
  shareToken: string | null;
  chapterCount: number | null;
  panelTotal: number;
  panelDone: number;
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

interface ComicCardProps {
  comic: Comic;
  copying: boolean;
  onDelete: (c: Comic) => void;
  onEdit: (c: Comic) => void;
  onCopy: (c: Comic) => void;
}

export default function ComicCard({ comic: c, copying, onDelete, onEdit, onCopy }: ComicCardProps) {
  const router = useRouter();
  const st = STATUS_LABEL[c.status] || STATUS_LABEL.draft;
  const cover = toImgUrl(c.coverUrl);
  const remaining = c.panelTotal - c.panelDone;

  return (
    <div
      className={`group bg-white rounded-2xl border border-violet-100/70 overflow-hidden hover:shadow-xl hover:shadow-violet-100 hover:-translate-y-1 transition-all duration-300 ${
        copying ? "opacity-60 pointer-events-none" : ""
      }`}
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
        <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs bg-black/60 text-white">
          {c.layoutType === "page" ? "页漫" : "条漫"}
        </span>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="text-gray-300 hover:text-violet-600 transition shrink-0"
                title="更多操作"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => router.push(`/comic/${c.id}`)}>
                <ExternalLink className="w-4 h-4 mr-2" /> 打开
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(c)}>
                <Pencil className="w-4 h-4 mr-2" /> 编辑
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onCopy(c)} disabled={copying}>
                {copying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                复制
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDelete(c)} className="text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {c.panelTotal > 0 && (
          <div className="mt-3">
            <Progress value={(c.panelDone / c.panelTotal) * 100} className="h-1" />
            <div className="mt-1.5 text-xs text-gray-400">
              {c.panelDone}/{c.panelTotal} 格
              {remaining > 0 && (
                <span className="text-violet-500">
                  {" "}
                  · 完成本话预计还需 {remaining * COMIC_CREDIT_COSTS.comicPanel} 积分
                </span>
              )}
            </div>
          </div>
        )}

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
}
