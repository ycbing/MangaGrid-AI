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

export const STYLE_PROMPT: Record<string, string> = {
  manga: "日式漫画风格（黑白为主，网点纹理，清晰线条，人物比例写实偏美型）",
  manhua: "国漫风格（彩色，精美厚涂，光影丰富，角色美型）",
  ink: "水墨国风（传统水墨渲染，留白构图，意境感强）",
  watercolor: "水彩风格（柔和水彩晕染，清新淡雅，治愈感）",
  cyberpunk: "赛博朋克漫画（霓虹配色，高对比，未来都市）",
  cartoon: "Q版卡通（圆润可爱，夸张表情，儿童绘本风格）",
};

function mockScript(input: string): ComicScript {
  // mock 标题：优先取书名号内文案，否则取第一个短句（≤12字，超长截断加省略号）
  const title = (() => {
    const t = input.trim();
    const quoted = t.match(/《([^》]{2,12})》/);
    if (quoted) return quoted[1];
    const first = t.split(/[，。！？；\n]/)[0].trim();
    if (first.length <= 12) return first || "未命名漫画";
    return first.slice(0, 12) + "…";
  })();
  const chars: ComicScriptCharacter[] = [
    { name: "林小满", role: "protagonist", gender: "女", age: "少女", appearance: "黑长直发，琥珀色眼眸，清秀瓜子脸，红白配色古风长裙，腰间玉佩", personality: "机灵倔强" },
    { name: "陈默", role: "supporting", gender: "男", age: "青年", appearance: "银白短发，冷峻剑眉，深蓝眼眸，玄色劲装，背一柄古剑", personality: "沉默寡言" },
    { name: "苏晚晴", role: "villain", gender: "女", age: "青年", appearance: "紫发高马尾，丹凤眼，红唇，暗紫纱衣，手持折扇", personality: "腹黑高傲" },
  ];
  const mk = (id: string, sd: string, ch: string[], dlg = "", nar = "", side = "left"): ComicPanel => ({
    scene_desc: sd, characters: ch, dialogue: dlg, narration: nar, bubble_side: side as any,
  });
  const scenes: ComicScene[] = [
    { id: "s1", scene_desc: "云雾缭绕的青山之巅，晨光穿透云海", panels: [
      mk("s1p1", "远景：云雾中的仙山，金色晨光照亮山峰，气势恢宏", ["林小满"], "", "传说…山巅之上，封印着上古神镜", "top"),
      mk("s1p2", "中景：林小满背着行囊艰难攀爬石阶，脸上满是倔强", ["林小满"], "就算是万丈悬崖，我也要爬上去！", "", "left"),
      mk("s1p3", "特写：林小满触碰石壁上一面古朴铜镜，镜面泛起涟漪金光", ["林小满"], "这镜子…在发光？", "", "right"),
    ]},
    { id: "s2", scene_desc: "古朴洞府内，铜镜悬浮空中散发出柔和光芒", panels: [
      mk("s2p1", "全景：洞府中央铜镜悬浮，光芒中隐约浮现一个人影", ["林小满"], "你是谁？", "", "right"),
      mk("s2p2", "中景：银发少年陈默从镜中走出，神情冷漠，打量四周", ["陈默"], "凡人，是你唤醒了我。", "", "left"),
      mk("s2p3", "林小满惊讶后退，陈默伸手示意她别怕", ["林小满", "陈默"], "我是镜中器灵，可助你修行…但有代价。", "", "left"),
    ]},
    { id: "s3", scene_desc: "宗门广场，紫衣女子苏晚晴居高临下俯视众人", panels: [
      mk("s3p1", "远景：宗门广场上人群攒动，苏晚晴立于高台，紫衣飘飘气场全开", ["苏晚晴"], "今日，我要取回属于我的东西。", "", "right"),
      mk("s3p2", "特写：苏晚晴展开折扇，眼神凌厉扫过人群，定格在林小满身上", ["苏晚晴", "林小满"], "那面镜子…在你身上？", "", "left"),
      mk("s3p3", "林小满下意识按住怀中铜镜，陈默在镜中低语警告", ["林小满", "陈默"], "别怕，有我在。", "", "top"),
    ]},
    { id: "s4", scene_desc: "黄昏山道，林小满狂奔逃离，身后有人影追来", panels: [
      mk("s4p1", "中景：林小满在山道上奔跑，衣袂翻飞，神色紧张回望", ["林小满"], "快跑…绝不能让她抢走镜子！", "", "left"),
      mk("s4p2", "远景：夕阳下，苏晚晴的身影出现在山道尽头，折扇轻摇，冷笑", ["苏晚晴"], "跑得掉吗？", "", "right"),
      mk("s4p3", "特写：林小满紧抱铜镜，镜面闪烁，陈默的声音在耳边响起——危机时刻，镜中之力觉醒", ["林小满", "陈默"], "", "镜灵觉醒…第一话完？不，这才刚刚开始。", "top"),
    ]},
  ];
  return { title, characters: chars, scenes };
}

function mockScriptContinuation(
  input: string,
  options: { chapterNumber?: number; existingCharacters?: ComicScriptCharacter[] } = {}
): ComicScript {
  const n = options.chapterNumber || 2;
  const chars: ComicScriptCharacter[] =
    options.existingCharacters && options.existingCharacters.length
      ? options.existingCharacters
      : [
          { name: "林小满", role: "protagonist", gender: "女", age: "少女", appearance: "黑长直发，琥珀色眼眸，清秀瓜子脸，红白配色古风长裙，腰间玉佩", personality: "机灵倔强" },
          { name: "陈默", role: "supporting", gender: "男", age: "青年", appearance: "银白短发，冷峻剑眉，深蓝眼眸，玄色劲装，背一柄古剑", personality: "沉默寡言" },
          { name: "苏晚晴", role: "villain", gender: "女", age: "青年", appearance: "紫发高马尾，丹凤眼，红唇，暗紫纱衣，手持折扇", personality: "腹黑高傲" },
        ];
  const hero = chars.find((c) => c.role === "protagonist") || chars[0];
  const villain = chars.find((c) => c.role === "villain") || chars[1] || chars[0];
  const mk = (id: string, sd: string, ch: string[], dlg = "", nar = "", side = "left"): ComicPanel => ({
    scene_desc: sd, characters: ch, dialogue: dlg, narration: nar, bubble_side: side as any,
  });
  const scenes: ComicScene[] = [
    { id: "s1", scene_desc: "云雾缭绕的青山之巅，晨光穿透云海", panels: [
      mk("s1p1", `远景：朝阳升起，${hero.name}立于山巅，神色凝重眺望远方`, [hero.name], "", `第${n}话 · 风波再起`, "top"),
      mk("s1p2", `中景：${hero.name}手握铜镜，镜面泛起涟漪，器灵的声音自镜中传出`, [hero.name], "镜中之力…在躁动？", "", "left"),
      mk("s1p3", `特写：铜镜金光暴涨，镜面浮现一道裂痕，隐约有暗影涌动`, [hero.name], "不好，封印要破了！", "", "right"),
    ]},
    { id: "s2", scene_desc: "古朴洞府内，紫衣女子负手踱步，神色阴冷", panels: [
      mk("s2p1", `全景：${villain.name}负手立于洞府中央，目光凌厉扫过虚空`, [villain.name], "那丫头…终于动用了镜中之力。", "", "right"),
      mk("s2p2", `中景：${villain.name}展开折扇，嘴角勾起一抹冷笑`, [villain.name], "这一次，我看你往哪逃。", "", "left"),
      mk("s2p3", `特写：${villain.name}掌心聚起暗紫灵光，虚空勾勒出法阵符文`, [villain.name], "", "猎杀…开始。", "top"),
    ]},
    { id: "s3", scene_desc: "黄昏山道，一场追逐战一触即发", panels: [
      mk("s3p1", `中景：${hero.name}在山道狂奔，衣袂翻飞，神色紧张回望`, [hero.name], "她追来了！", "", "left"),
      mk("s3p2", `远景：${villain.name}御风而来，法阵当空压下，威压逼人`, [villain.name, hero.name], "交出镜子，饶你不死。", "", "right"),
      mk("s3p3", `特写：${hero.name}咬牙催动铜镜，金光与暗紫灵光对撞，光芒炸裂`, [hero.name, villain.name], "", `镜灵觉醒 · 第${n}话 完。`, "top"),
    ]},
  ];
  return { title: "风波再起", characters: chars, scenes };
}

/**
 * 生成漫画脚本（第 N 话 / 续写）

 */
export async function generateComicScript(
  input: string,
  options: {
    genre?: string;
    style?: string;
    layoutType?: "strip" | "page";
    panelCount?: number;
    userId?: string;
    chapterNumber?: number; // 第几话（默认 1 = 第一话）
    existingCharacters?: ComicScriptCharacter[]; // 已有角色卡（续写时复用）
    continuity?: string; // 前情提要 / 上文
  } = {}
): Promise<ComicScript> {
  const genre = options.genre || "fantasy";
  const style = options.style || "manhua";
  const layoutType = options.layoutType || "strip";
  const panelCount = options.panelCount || 20;
  const chapterNumber = options.chapterNumber || 1;
  const existingCharacters = options.existingCharacters || [];
  const continuity = options.continuity;
  const isContinuation = chapterNumber > 1 || existingCharacters.length > 0;

  const styleDesc = STYLE_PROMPT[style] || STYLE_PROMPT.manhua;
  const genreZh = GENRE_ZH[genre] || "玄幻";

  // MOCK 模式：无 LLM key 时用于全流程联调
  if (process.env.MOCK_SCRIPT === "1") {
    return isContinuation ? mockScriptContinuation(input, options) : mockScript(input);
  }

  const chapterLabel = isContinuation ? `第 ${chapterNumber} 话` : "第一话";
  const charLines = existingCharacters
    .map((c) => `- ${c.name}（${c.role}）：${c.appearance}，性格：${c.personality}`)
    .join("\n");
  const charSection = isContinuation
    ? `1. 沿用以下已有角色卡，保持其外貌与性格完全一致，让角色在后续剧情中成长或推进关系\n${charLines || "- （暂无，可自行设计 3-5 个角色）"}\n2. 若剧情需要可新增 1-2 个角色，但必须给出固定 appearance`
    : "";
  const continuitySection = isContinuation
    ? `\n\n# 前情提要（上文仅作背景参考，不要重复已发生情节）\n${(continuity || "").slice(0, 1200) || "承接上一话结尾悬念继续展开"}`
    : "";

  const systemPrompt = `你是一位专业的漫画编剧和分镜师。根据用户提供的内容，创作一部${genreZh}题材的漫画${chapterLabel}脚本。

# 创作要求
1. **分格合理**: 共 ${panelCount} 格左右（±3），${layoutType === "strip" ? "条漫竖排" : "页漫横排"}，每格是一个独立画面
2. **网文漫改逻辑**: 如果是小说章节，保留核心情节和对话，删减心理描写和冗余叙述；如果是创意，自行展开完整小故事
3. **开场 3 格必须交代**: 世界观氛围 + 主角登场 + 钩子/冲突
4. **每格画面感强**: scene_desc 描述场景、人物动作、表情、镜头角度，可直接用于生图
5. **对话精炼**: dialogue 是台词（无引号），每格最多 1 句（≤20字），宁少勿多；narration 是旁白（≤15字）
6. **角色一致**: 每个角色的 appearance 必须固定且详细（性别+年龄+发型发色+脸型+眼睛+体型+服装+标志性配饰），后续所有格子的生图都依赖它
7. **气泡位置**: dialogue 的 bubble_side 根据画面构图选 left/right；narration 用 top
8. **结尾留钩子**: 最后一格制造悬念，吸引读者看下一话

# 角色一致性（续写）
${charSection}

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

${continuitySection}
注意：
- characters 3-5 个，appearance 必须具体
- dialogue 和 narration 至少保证一格有其一，避免整格无文字
- 不要输出 JSON 以外的任何内容`;

  const contReq = isContinuation
    ? continuity
      ? `\n【续写要求】以下是你要接续的剧情要点，请据此推进：\n${continuity.slice(0, 1000)}`
      : `\n【续写要求】请自然延续上一话结尾的悬念推进剧情，不要重复第一话已发生的情节。`
    : "";
  const userPrompt = `【用户输入】
${input.slice(0, 4000)}

请生成漫画${chapterLabel}脚本。${contReq}`;

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