// 通用生图风格关键词映射（自原 script-generator 提取，供 image-generator 复用）
export type ComicImageStyle = "realistic" | "anime" | "ink" | "cyberpunk";

export const STYLE_IMAGE_PROMPT: Record<ComicImageStyle, string> = {
  realistic: "写实摄影风格，高清照片质感，自然光线，真实场景",
  anime: "日式动漫风格，色彩鲜艳，线条清晰，精美插画",
  ink: "中国传统水墨画风格，意境深远，留白构图，墨色渲染",
  cyberpunk: "赛博朋克风格，霓虹灯光，未来科技感，暗色调配高饱和色彩",
};

export function getStyleImagePrompt(style: ComicImageStyle): string {
  return STYLE_IMAGE_PROMPT[style];
}
