"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Wand2, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

const STYLES = [
  { id: "manhua", name: "国漫厚涂", desc: "彩色精美，光影丰富", emoji: "🎨" },
  { id: "manga", name: "日漫", desc: "黑白网点，线稿美型", emoji: "📖" },
  { id: "ink", name: "水墨国风", desc: "传统水墨，意境留白", emoji: "🖌️" },
  { id: "watercolor", name: "水彩", desc: "柔和晕染，清新治愈", emoji: "✨" },
  { id: "cyberpunk", name: "赛博朋克", desc: "霓虹高对比，未来都市", emoji: "🌆" },
  { id: "cartoon", name: "Q版卡通", desc: "圆润可爱，夸张表情", emoji: "🧸" },
];

const GENRES = [
  { id: "fantasy", name: "玄幻", emoji: "🐉" },
  { id: "urban", name: "都市", emoji: "🏙️" },
  { id: "ancient", name: "古风", emoji: "🏮" },
  { id: "mystery", name: "悬疑", emoji: "🔍" },
  { id: "romance", name: "恋爱", emoji: "💕" },
  { id: "scifi", name: "科幻", emoji: "🚀" },
];

const TEMPLATES = [
  { text: "一个修仙废柴少年偶得神秘古镜，镜中住着一位傲娇器灵少女，两人携手踏上逆袭之路", genre: "fantasy" },
  { text: "社畜林晓意外穿书成恶毒女配，绑定吐槽系统，专治各种不服的霸道总裁", genre: "urban" },
  { text: "京城第一纨绔世子爷，实则是隐藏的锦衣卫暗桩，为查悬案扮猪吃虎", genre: "ancient" },
  { text: "深夜便利店的店员发现，每晚 12 点整，总有一个穿红裙的女人来买同一种啤酒", genre: "mystery" },
];

export default function CreateComicPage() {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [genre, setGenre] = useState("fantasy");
  const [style, setStyle] = useState("manhua");
  const [layoutType, setLayoutType] = useState<"strip" | "page">("strip");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (sourceText.trim().length < 10) {
      toast.error("请至少输入 10 字创意或小说内容");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/comics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          sourceText: sourceText.trim(),
          genre,
          style,
          layoutType,
        }),
      });
      const d = await r.json();
      if (r.ok && d.comicId) {
        toast.success("脚本生成完成 🎉");
        router.push(`/comic/${d.comicId}`);
      } else {
        toast.error(d.error || "创建失败");
        if (d.code === "INSUFFICIENT_CREDITS") router.push("/settings");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b to-violet-50/50 to-white">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" /> 返回
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold">漫格 MangaGrid</span>
          </Link>
          <div className="w-14" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">从文字到漫画，只需一步</h1>
          <p className="text-gray-500 mt-2">粘贴小说章节或输入创意，AI 自动生成脚本、锁定角色、画出分镜</p>
        </div>

        {/* 快速模板 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {TEMPLATES.map((t, i) => (
            <button
              key={i}
              onClick={() => {
                setSourceText(t.text);
                setGenre(t.genre);
              }}
              className="text-left p-3.5 rounded-xl border border-dashed hover:border-violet-400 hover:bg-violet-50/50 transition text-sm text-gray-600"
            >
              <Sparkles className="w-4 h-4 inline mr-1.5 text-violet-400" />
              {t.text}
            </button>
          ))}
        </div>

        {/* 创意输入 */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <label className="block text-sm font-medium mb-2">
            创意 / 小说章节 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="例：输入你小说的开头章节，或一句话创意：『小职员意外获得读心术，发现老板的秘密…』"
            className="w-full h-40 rounded-xl border p-4 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
          <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
            <span>AI 将基于此内容创作漫画第一话（约 20 格）</span>
            <span>{sourceText.length} 字</span>
          </div>
        </div>

        {/* 题材 + 画风 + 版式 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <label className="block text-sm font-medium mb-3">题材</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGenre(g.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    genre === g.id
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"
                  }`}
                >
                  {g.emoji} {g.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <label className="block text-sm font-medium mb-3">画风</label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  title={s.desc}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    style === s.id
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
                  }`}
                >
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <label className="block text-sm font-medium mb-3">版式</label>
            <div className="flex gap-2">
              <button
                onClick={() => setLayoutType("strip")}
                className={`flex-1 px-3 py-2.5 rounded-xl border text-sm transition ${
                  layoutType === "strip"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                📱 条漫（竖屏）
              </button>
              <button
                onClick={() => setLayoutType("page")}
                className={`flex-1 px-3 py-2.5 rounded-xl border text-sm transition ${
                  layoutType === "page"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                📄 页漫（横版）
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="mt-6 w-full bg-gradient-to-r to-violet-600 to-purple-600 text-white py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-60 transition"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> AI 正在编剧（约 30 秒）…
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" /> 生成漫画第一话（消耗 2 积分）
            </>
          )}
        </button>
      </main>
    </div>
  );
}