"use client";

import { useState } from "react";

interface Panel {
  id: string;
  panelNumber: number;
  sceneDesc: string;
  dialogue: string | null;
  narration: string | null;
  bubbleSide: string | null;
  imageUrl: string | null;
  status?: string;
}

/** 根据台词长度自适应字号，避免长台词溢出气泡 */
function bubbleTextClass(len: number) {
  if (len > 24) return "text-[11px] leading-snug";
  if (len > 14) return "text-xs leading-snug";
  return "text-sm leading-snug";
}

/** 单格渲染：图片 + 对话气泡 + 旁白（图字分离，阅读器/分享页共用） */
export default function PanelView({ panel, img }: { panel: Panel; img: string | null }) {
  const side = panel.bubbleSide || "bottom";
  const dialogue = panel.dialogue?.trim();
  const narration = panel.narration?.trim();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="relative w-full bg-gray-100 select-none">
      {img && (
        <img
          src={img}
          alt={`P${panel.panelNumber}`}
          className={`w-full h-auto block transition-opacity duration-300 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
          draggable={false}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
        />
      )}
      {/* 图片加载占位 */}
      {img && !imgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
        </div>
      )}

      {/* 旁白：顶部居中，仿漫画旁白框 */}
      {narration && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 max-w-[85%]">
          <div className="bg-black/75 text-white text-[13px] leading-snug px-3.5 py-1.5 rounded-lg shadow-md text-center border border-white/20 backdrop-blur-sm break-words max-h-24 overflow-y-auto">
            {narration}
          </div>
        </div>
      )}

      {/* 台词气泡：根据 bubbleSide 定位，长文本自适应 */}
      {dialogue && (
        <div
          className={`absolute max-w-[70%] ${
            side === "left"
              ? "left-2.5 top-1/2 -translate-y-1/2"
              : side === "right"
              ? "right-2.5 top-1/2 -translate-y-1/2"
              : side === "top"
              ? "top-10 left-1/2 -translate-x-1/2"
              : "bottom-2.5 left-1/2 -translate-x-1/2"
          }`}
        >
          <div
            className={`relative bg-white text-gray-900 ${bubbleTextClass(dialogue.length)} px-3 py-2 rounded-2xl shadow-lg border-2 border-gray-800 break-words ${
              side === "left" || side === "right" ? "" : "text-center"
            }`}
          >
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
