// ============================================
// 漫格 MangaGrid - 漫画脚本生成器
// 输入: 创意/小说章节 → 输出: 结构化漫画脚本 (角色卡 + 分幕分格)
// ============================================

import { chatCompletionJSON } from "./glm-client";
import { createLogger } from "@/lib/logger";

const log = createLogger("comic-script-gen");

export interface ComicScriptCharacter {
  name: string;
  role: "protagonist" | "supporting" | "villain";
  gender: string;
  age: string;
  appearance: string; // 固定外貌描述，跨格注入保持一致性
  personality: string;
}

export interface ComicPanel {
  scene_desc: string; // 画面描述（生图用）
  characters: string[]; // 出场角色名
  dialogue: string; // 角色台词（气泡），无则空
  narration: string; // 旁白（气泡/顶部），无则空
  bubble_side: "left" | "right" | "top" | "bottom" | "center";
}

export interface ComicScene {
  id: string;
  scene_desc: string; // 场景/地点描述
  panels: ComicPanel[];
}

export interface ComicScript {
  title: string;
  characters: ComicScriptCharacter[];
  scenes: ComicScene[];
}

const GENRE_ZH: Record<string, string> = {
  fantasy: "玄幻",
  urban: "都市",
  ancient: "古风",
  mystery: "悬疑",
  romance: "恋爱",
  scifi: "科幻",
};

const STYLE_PROMPT: Record<string, string> = {
  manga: "日式漫画风格（黑白为主，网点纹理，清晰线条，人物比例写实偏美型）",
  manhua: "国漫风格（彩色，精美厚涂，光影丰富，角色美型）",
  ink: "水墨国风（传统水墨渲染，留白构图，意境感强）",
  watercolor: "水彩风格（柔和水彩晕染，清新淡雅，治愈感）",
  cyberpunk: "赛博朋克漫画（霓虹配色，高对比，未来都市）",
  cartoon: "Q版卡通（圆润可爱，夸张表情，儿童绘本风格）",
};

/**
 * 生成漫画脚本（第一话）
 */
export async function generateComicScript(
  input: string,
  options: {
    genre?: string;
    style?: string;
    layoutType?: "strip" | "page";
    panelCount?: number;
    userId?: string;
  } = {}
): Promise<ComicScript> {
  const genre = options.genre || "fantasy";
  const style = options.style || "manhua";
  const layoutType = options.layoutType || "strip";
  const panelCount = options.panelCount || 20;

  const styleDesc = STYLE_PROMPT[style] || STYLE_PROMPT.manhua;
  const genreZh = GENRE_ZH[genre] || "玄幻";

  const systemPrompt = `你是一位专业的漫画编剧和分镜师。根据用户提供的内容，创作一部${genreZh}题材的漫画第一话脚本。

# 创作要求
1. **分格合理**: 共 ${panelCount} 格左右（±3），${layoutType === "strip" ? "条漫竖排" : "页漫横排"}，每格是一个独立画面
2. **网文漫改逻辑**: 如果是小说章节，保留核心情节和对话，删减心理描写和冗余叙述；如果是创意，自行展开完整小故事
3. **开场 3 格必须交代**: 世界观氛围 + 主角登场 + 钩子/冲突
4. **每格画面感强**: scene_desc 描述场景、人物动作、表情、镜头角度，可直接用于生图
5. **对话精炼**: dialogue 是台词（无引号），每格最多 1 句（≤20字），宁少勿多；narration 是旁白（≤15字）
6. **角色一致**: 每个角色的 appearance 必须固定且详细（性别+年龄+发型发色+脸型+眼睛+体型+服装+标志性配饰），后续所有格子的生图都依赖它
7. **气泡位置**: dialogue 的 bubble_side 根据画面构图选 left/right；narration 用 top
8. **结尾留钩子**: 最后一格制造悬念，吸引读者看下一话

# 画风
${styleDesc}

# JSON 输出格式（严格）
{
  "title": "话标题（吸引人，≤12字）",
  "characters": [
    {
      "name": "角色名",
      "role": "protagonist | supporting | villain",
      "gender": "男/女",
      "age": "青年/中年/老年/少年…",
      "appearance": "固定外貌描述（性别+年龄+发型发色+脸型+眼睛+体型+服装+配饰）",
      "personality": "性格特点（2-3词）"
    }
  ],
  "scenes": [
    {
      "id": "s1",
      "scene_desc": "场景地点描述（如：雨天的高中天台，远处城市霓虹）",
      "panels": [
        {
          "scene_desc": "本格画面描述（含角色动作表情镜头，可直接生图）",
          "characters": ["角色名"],
          "dialogue": "台词或空字符串",
          "narration": "旁白或空字符串",
          "bubble_side": "left"
        }
      ]
    }
  ]
}

注意：
- characters 3-5 个，appearance 必须具体
- dialogue 和 narration 至少保证一格有其一，避免整格无文字
- 不要输出 JSON 以外的任何内容`;

  const userPrompt = `【用户输入】
${input.slice(0, 4000)}

请生成漫画第一话脚本。`;

  const result = await chatCompletionJSON<ComicScript>(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.8,
      userId: options.userId,
    }
  );

  // 兜底校验
  if (!result.characters?.length || !result.scenes?.length) {
    throw new Error("漫画脚本生成结果结构不完整");
  }

  const totalPanels = result.scenes.reduce((n, s) => n + (s.panels?.length || 0), 0);
  log.info(`漫画脚本生成完成: ${result.title}, ${result.characters.length}角色, ${totalPanels}格`);

  return result;
}