"use client";

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

/** 单格渲染：图片 + 对话气泡 + 旁白（图字分离，阅读器/分享页共用） */
export default function PanelView({ panel, img }: { panel: Panel; img: string | null }) {
  const side = panel.bubbleSide || "bottom";
  const dialogue = panel.dialogue?.trim();
  const narration = panel.narration?.trim();

  return (
    <div className="relative w-full bg-black select-none">
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={`P${panel.panelNumber}`}
          className="w-full h-auto block"
          draggable={false}
          loading="lazy"
        />
      )}

      {/* 旁白：顶部居中，仿漫画旁白框 */}
      {narration && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 max-w-[80%]">
          <div className="bg-black/75 text-white text-[13px] leading-snug px-3.5 py-1.5 rounded-lg shadow-md text-center border border-white/20 backdrop-blur-sm">
            {narration}
          </div>
        </div>
      )}

      {/* 台词气泡：根据 bubbleSide 定位 */}
      {dialogue && (
        <div
          className={`absolute max-w-[65%] ${
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
            className={`relative bg-white text-gray-900 text-sm leading-snug px-3.5 py-2 rounded-2xl shadow-lg border-2 border-gray-800 ${
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