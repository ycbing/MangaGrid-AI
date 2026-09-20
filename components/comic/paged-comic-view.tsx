"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PanelView, { type Panel } from "./panel-view";
import { groupPanelsIntoPages } from "./page-layout";

export type ReadMode = "paged" | "scroll";

const READ_MODE_KEY = "mangagrid.readMode";

/** 阅读模式偏好（localStorage 记忆，隐私模式降级为默认翻页） */
export function useReadMode(): [ReadMode, (m: ReadMode) => void] {
  const [mode, setMode] = useState<ReadMode>("paged");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(READ_MODE_KEY);
      // 挂载后再读偏好：SSR 与客户端首帧渲染一致，避免水合不匹配
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "paged" || saved === "scroll") setMode(saved);
    } catch {
      // localStorage 不可用，保持默认
    }
  }, []);

  const update = (m: ReadMode) => {
    setMode(m);
    try {
      window.localStorage.setItem(READ_MODE_KEY, m);
    } catch {
      // 忽略写入失败
    }
  };

  return [mode, update];
}

/** 页漫翻页视图：按拼版节奏分页，键盘 ←/→ 或按钮翻页 */
export default function PagedComicView({
  panels,
  toImgUrl,
}: {
  panels: Panel[];
  toImgUrl: (url: string | null) => string | null;
}) {
  const pages = useMemo(() => groupPanelsIntoPages(panels.length), [panels.length]);
  const [pageIndex, setPageIndex] = useState(0);
  const safeIndex = Math.min(Math.max(pageIndex, 0), pages.length - 1);
  const page = pages[safeIndex];

  const go = (delta: number) =>
    setPageIndex(Math.max(0, Math.min(pages.length - 1, safeIndex + delta)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, pages.length]);

  if (!page) return null;

  return (
    <div className="px-4 py-4 select-none">
      <div className="space-y-2">
        {page.rows.map((row, ri) => (
          <div
            key={ri}
            className={
              row.slots.length === 2
                ? "grid grid-cols-2 gap-2 items-center justify-items-center"
                : "flex justify-center"
            }
          >
            {row.slots.map((slot) => {
              const p = panels[slot.panelIndex];
              if (!p) return null;
              return (
                <PanelView
                  key={p.id}
                  panel={p}
                  img={toImgUrl(p.imageUrl)}
                  className="w-fit max-w-full"
                  imgClassName={
                    slot.span === "full" ? "w-auto max-h-[62vh]" : "w-auto max-h-[40vh]"
                  }
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* 翻页控件 */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          onClick={() => go(-1)}
          disabled={safeIndex === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white border border-violet-100 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-40 disabled:hover:bg-white transition"
        >
          <ChevronLeft className="w-4 h-4" /> 上一页
        </button>
        <span className="text-sm text-gray-500 tabular-nums">
          第 {safeIndex + 1} / {pages.length} 页
        </span>
        <button
          onClick={() => go(1)}
          disabled={safeIndex >= pages.length - 1}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white border border-violet-100 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-40 disabled:hover:bg-white transition"
        >
          下一页 <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-400 hidden sm:block">键盘 ← → 也可翻页</p>
    </div>
  );
}
