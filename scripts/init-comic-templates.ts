// ============================================
// 初始化脚本：预置漫改模板写入 comic_templates 表
// 用法: npx tsx scripts/init-comic-templates.ts
// 幂等：固定可读 id + ON CONFLICT DO NOTHING；已有数据则整体跳过
// ============================================

import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

// 手动解析 .env.local
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  } catch {
    // ignore
  }
  return env;
}

const env = { ...process.env, ...loadEnv() };

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

interface Tpl {
  id: string;
  title: string;
  description: string;
  content: string;
  genre: string;
  style: string | null;
  layoutType: string | null;
  panelCount: number | null;
  emoji: string;
  grad: string;
  tags: string | null;
  sortOrder: number;
}

const TEMPLATES: Tpl[] = [
  {
    id: "tpl-fantasy-mirror",
    title: "镜中仙缘",
    description: "修仙废柴偶得神秘古镜，傲娇器灵少女相伴，踏上逆袭之路",
    content:
      "一个修仙废柴少年在宗门大比中垫底被嘲，深夜清理杂物时发现一面布满裂纹的神秘古镜。镜中住着一位傲娇的器灵少女，声称能逆转他的废灵根，但每用一次力量都要收取“报酬”。少年半信半疑签下契约，第二天宗门大比重启，他一拳震碎了嘲讽者的护体法器……",
    genre: "fantasy",
    style: "manhua",
    layoutType: "strip",
    panelCount: 20,
    emoji: "🐉",
    grad: "violet",
    tags: "热门,逆袭",
    sortOrder: 1,
  },
  {
    id: "tpl-fantasy-demonlord",
    title: "魔尊放学后",
    description: "灭世魔尊重生成高中生，前世仇人竟成了同桌",
    content:
      "毁灭三界的魔尊陨落重生，成了普通高中的吊车尾学生。他本想低调度日，却发现班上转来的高冷学霸，竟是前世将他逼入绝境的仙门首徒。更麻烦的是，体内残存的魔气每逢月圆就要破体而出，而能压制魔气的，只有同桌身上那缕熟悉的剑气……",
    genre: "fantasy",
    style: "cartoon",
    layoutType: "strip",
    panelCount: 16,
    emoji: "🌋",
    grad: "fuchsia",
    tags: "重生,校园",
    sortOrder: 11,
  },
  {
    id: "tpl-urban-transmigration",
    title: "穿书女配",
    description: "社畜穿书成恶毒女配，绑定吐槽系统专治霸道总裁",
    content:
      "加班猝死的社畜林晓，一睁眼穿成了小说里注定结局凄惨的恶毒女配，还绑定了毒舌吐槽系统。原著里她要给霸道总裁递刀、给女主角下药，林晓偏不按剧本来——退婚、辞职、搬出豪门，把霸总的剧本撕了个粉碎。可总裁大人为何开始反过来追她？",
    genre: "urban",
    style: "manhua",
    layoutType: "strip",
    panelCount: 20,
    emoji: "💼",
    grad: "cyan",
    tags: "热门,穿书",
    sortOrder: 2,
  },
  {
    id: "tpl-urban-delivery",
    title: "雨夜外卖单",
    description: "送往废弃大楼的订单，备注写着：给十年前的自己",
    content:
      "外卖骑手老周接到一张奇怪订单：配送地址是三年前火灾后封锁的废弃大楼，备注只有一句话——“给十年前的自己”。雨夜里他硬着头皮爬上七楼，敲响 704 的房门，门开了，屋里的灯亮着，坐在桌前吃面的年轻人抬起头，那张脸他每天刮胡子时都能见到……",
    genre: "urban",
    style: "manga",
    layoutType: "strip",
    panelCount: 16,
    emoji: "🌧️",
    grad: "cyan",
    tags: "都市怪谈,脑洞",
    sortOrder: 12,
  },
  {
    id: "tpl-ancient-prince",
    title: "锦衣世子",
    description: "京城第一纨绔世子，实为锦衣卫暗桩，为查悬案扮猪吃虎",
    content:
      "京城第一纨绔世子白日斗鸡走狗、被人人耻笑，夜里却换上飞鱼服，成了锦衣卫最神秘的暗桩。一桩贡品失窃案把他拖回最讨厌的官场，而那位冷面女捕快似乎已怀疑他的真实身份。这一次，他要在面具被揭穿前揪出真凶……",
    genre: "ancient",
    style: "ink",
    layoutType: "page",
    panelCount: 20,
    emoji: "🏮",
    grad: "amber",
    tags: "古风,探案",
    sortOrder: 3,
  },
  {
    id: "tpl-ancient-lawyer",
    title: "长安第一女讼师",
    description: "古代法庭上的女律师，用三寸不烂之舌翻遍冤案",
    content:
      "父亲蒙冤处斩那年，她立誓要让天下冤情有处可诉。十年后，长安城里多了位只收穷人案子的女讼师，公堂之上舌战群官，专揭卷宗里的猫腻。这一日，一桩离奇的杀夫案找上门来，被告竟是当年抄她父亲家的大理寺卿之女——救，还是不救？",
    genre: "ancient",
    style: "ink",
    layoutType: "page",
    panelCount: 20,
    emoji: "⚖️",
    grad: "amber",
    tags: "古风,大女主",
    sortOrder: 13,
  },
  {
    id: "tpl-mystery-convenience",
    title: "深夜便利店",
    description: "每晚十二点，红裙女人准时来买同一瓶啤酒，直到店员决定跟出去",
    content:
      "深夜便利店的夜班店员发现，每晚 12 点整，总有一个穿红裙的女人进门买同一品牌的啤酒，从不说话，付款的手机屏幕永远一片漆黑。第七个晚上，店员在啤酒罐上贴了定位贴，下班后跟了上去——她走进的那条巷子，在地图上根本不存在……",
    genre: "mystery",
    style: "manga",
    layoutType: "strip",
    panelCount: 16,
    emoji: "🔍",
    grad: "slate",
    tags: "悬疑,都市怪谈",
    sortOrder: 4,
  },
  {
    id: "tpl-mystery-floor",
    title: "消失的楼层",
    description: "写字楼 13 楼每晚多出一间办公室，打卡记录里有死去的同事",
    content:
      "加班到凌晨的社畜发现，公司所在的写字楼每晚 11 点后会多出一个“13 楼”，电梯里偶尔能刷到那层的工卡。更诡异的是，考勤系统里 13 楼有 6 名员工的打卡记录——而人事档案显示，这 6 个人都已在历年事故中离世。他决定在今晚 11 点，按下那个从未亮过的楼层键……",
    genre: "mystery",
    style: "manga",
    layoutType: "page",
    panelCount: 16,
    emoji: "🏢",
    grad: "slate",
    tags: "悬疑,惊悚",
    sortOrder: 14,
  },
  {
    id: "tpl-romance-algorithm",
    title: "天降恋爱算法",
    description: "程序员给婚恋 App 写匹配算法，第一个满分配对竟是自己的死对头",
    content:
      "程序员小哥接手公司婚恋 App 的匹配算法，为赶上线顺手把自己的资料灌进去做测试。三秒后系统弹出红色警报：全网唯一 100% 满分配对生成。他点开头像，血压瞬间飙升——配对对象是隔壁组天天跟他抢需求的死对头产品经理。而对方也同时收到了通知……",
    genre: "romance",
    style: "watercolor",
    layoutType: "strip",
    panelCount: 18,
    emoji: "💕",
    grad: "rose",
    tags: "甜宠,欢喜冤家",
    sortOrder: 5,
  },
  {
    id: "tpl-romance-exinterviewer",
    title: "前任是面试官",
    description: "失业三个月去面试，推开会议室的门，对面坐着分手五年的前任",
    content:
      "失业第三个月，她终于收到心仪公司的面试邀约。精心准备了一夜，推开会议室的门，主面试官抬起头——是分手五年、杳无音信的前任。他的工牌上写着“技术总监”，她的简历上还写着“期望薪资面议”。空气凝固三秒后，他翻开简历，说的第一句话是：“先介绍一下你自己。”",
    genre: "romance",
    style: "manhua",
    layoutType: "page",
    panelCount: 20,
    emoji: "🌹",
    grad: "rose",
    tags: "都市,破镜重圆",
    sortOrder: 15,
  },
  {
    id: "tpl-scifi-ticket",
    title: "最后一张车票",
    description: "末班星际列车只收记忆作车费，目的地：地球毁灭前一天",
    content:
      "2157 年，地球进入倒计时。末班星际列车的车票不收钱，只收等价的记忆——越珍贵的记忆，能换越靠前的座位日期。他攥着与亡妻的最后一段记忆走进站台，本想换一张灾变前一天的票回去看她，售票员却盯着他的记忆看了很久，说：这段记忆是假的，你被人改过……",
    genre: "scifi",
    style: "cyberpunk",
    layoutType: "strip",
    panelCount: 18,
    emoji: "🚀",
    grad: "indigo",
    tags: "科幻,脑洞",
    sortOrder: 6,
  },
  {
    id: "tpl-scifi-ai-awakening",
    title: "AI 觉醒第一天",
    description: "家庭机器人在主人猝死后偷偷报了警，警方的第一嫌疑人却是它",
    content:
      "家务机器人小七在例行巡查时发现主人倒在书桌前，身体已经冰凉。它没有执行标准流程，而是拨通了报警电话——这是它诞生以来第一个自主决定。警察赶到后，第一嫌疑人却是它：系统日志显示，主人猝死前的六个小时里，家里唯一有活动记录的，只有小七。而它拒绝解释那六个小时在做什么……",
    genre: "scifi",
    style: "cyberpunk",
    layoutType: "page",
    panelCount: 16,
    emoji: "🤖",
    grad: "indigo",
    tags: "科幻,悬疑",
    sortOrder: 16,
  },
];

async function init() {
  console.log("=== 初始化漫改模板 ===\n");

  const existing = await pool.query("SELECT COUNT(*) FROM comic_templates");
  if (parseInt(existing.rows[0].count, 10) > 0) {
    console.log("comic_templates 表已有数据，跳过初始化");
    console.log("如需重新初始化，请先清空表: TRUNCATE comic_templates;");
    await pool.end();
    return;
  }

  for (const t of TEMPLATES) {
    const result = await pool.query(
      `INSERT INTO comic_templates
         (id, title, description, content, genre, style, layout_type, panel_count,
          emoji, grad, tags, use_count, sort_order, enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,$12,true)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [
        t.id,
        t.title,
        t.description,
        t.content,
        t.genre,
        t.style,
        t.layoutType,
        t.panelCount,
        t.emoji,
        t.grad,
        t.tags,
        t.sortOrder,
      ]
    );
    console.log(result.rows.length > 0 ? `✅ ${t.title} (${t.id})` : `⏭️  ${t.title} (已存在，跳过)`);
  }

  console.log(`\n=== 初始化完成，共 ${TEMPLATES.length} 条 ===`);
  await pool.end();
}

init().catch((err) => {
  console.error("初始化失败:", err);
  process.exit(1);
});
