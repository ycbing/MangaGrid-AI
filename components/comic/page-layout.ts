// ============================================
// 页漫拼版节奏（纯函数，Web 翻页视图与 PDF 拼版共用）
// ============================================
// 每页 3-4 格：全宽大格与半宽格交替（pattern A 大格在上 / B 大格在下），
// 末页按剩余格数自适应（4→四宫格、2→一行两格、1→压轴全宽），特例页不推进轮换。
// 图片一律 contain 展示，禁止裁切（气泡叠在图上）。

export interface LayoutSlot {
  span: "full" | "half";
  panelIndex: number;
}

export interface LayoutRow {
  slots: LayoutSlot[]; // full 行 1 格；half 行 2 格
}

export interface ComicPage {
  rows: LayoutRow[];
}

type Span = "full" | "half";

const PATTERN_A: Span[] = ["full", "half", "half"]; // 大格在上
const PATTERN_B: Span[] = ["half", "half", "full"]; // 大格在下

/** 把一段 span 序列组装成行（full 独占一行，相邻 half 两两同行） */
function buildPage(spans: Span[], startIndex: number): ComicPage {
  const page: ComicPage = { rows: [] };
  let idx = startIndex;
  let i = 0;
  while (i < spans.length) {
    if (spans[i] === "full") {
      page.rows.push({ slots: [{ span: "full", panelIndex: idx++ }] });
      i += 1;
    } else {
      const slots: LayoutSlot[] = [{ span: "half", panelIndex: idx++ }];
      if (spans[i + 1] === "half") slots.push({ span: "half", panelIndex: idx++ });
      page.rows.push({ slots });
      i += slots.length;
    }
  }
  return page;
}

/** 按拼版节奏把 panelCount 个分格组成页 */
export function groupPanelsIntoPages(panelCount: number): ComicPage[] {
  const pages: ComicPage[] = [];
  let start = 0;
  let cursor = 0; // A/B 轮换游标，跨页持续
  while (start < panelCount) {
    const remaining = panelCount - start;
    let spans: Span[];
    if (remaining === 4) {
      spans = ["half", "half", "half", "half"]; // 四宫格
    } else if (remaining === 2) {
      spans = ["half", "half"];
    } else if (remaining === 1) {
      spans = ["full"]; // 压轴大格
    } else {
      spans = cursor % 2 === 0 ? PATTERN_A : PATTERN_B;
      cursor += 1;
    }
    const page = buildPage(spans, start);
    start += page.rows.reduce((n, r) => n + r.slots.length, 0);
    pages.push(page);
  }
  return pages;
}
