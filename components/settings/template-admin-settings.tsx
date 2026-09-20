"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GENRE_META, TEMPLATE_GRADIENTS } from "@/lib/constants";

interface TplRow {
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
  useCount: number;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
}

const STYLE_LABELS: Record<string, string> = {
  manhua: "国漫厚涂",
  manga: "日漫",
  ink: "水墨国风",
  watercolor: "水彩",
  cyberpunk: "赛博朋克",
  cartoon: "Q版卡通",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  content: "",
  genre: "fantasy",
  style: "",
  layoutType: "",
  panelCount: "",
  emoji: "✨",
  grad: "violet",
  tags: "",
  sortOrder: "0",
  enabled: true,
};

type FormState = typeof EMPTY_FORM;

// 表单状态 ← 行数据（编辑回填）
function toForm(t: TplRow): FormState {
  return {
    title: t.title,
    description: t.description,
    content: t.content,
    genre: t.genre,
    style: t.style || "",
    layoutType: t.layoutType || "",
    panelCount: t.panelCount != null ? String(t.panelCount) : "",
    emoji: t.emoji,
    grad: t.grad,
    tags: t.tags || "",
    sortOrder: String(t.sortOrder),
    enabled: t.enabled,
  };
}

export default function TemplateAdminSettings() {
  const [templates, setTemplates] = useState<TplRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      toast.error("加载模板列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 挂载即拉取管理列表（与 model-config-settings.tsx 同款数据加载模式）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTemplates();
  }, [fetchTemplates]);

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.content.trim()) {
      toast.error("请填写标题、简介和创意文案");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...(editingId ? { id: editingId } : {}),
        title: form.title,
        description: form.description,
        content: form.content,
        genre: form.genre,
        style: form.style || undefined,
        layoutType: form.layoutType || undefined,
        panelCount: form.panelCount ? Number(form.panelCount) : undefined,
        emoji: form.emoji,
        grad: form.grad,
        tags: form.tags || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        enabled: form.enabled,
      };
      const res = await fetch("/api/admin/templates", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "保存失败");
      }
      toast.success(editingId ? "模板已更新" : "模板已创建");
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchTemplates();
    } catch (err) {
      toast.error(`保存失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (t: TplRow) => {
    try {
      const res = await fetch("/api/admin/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, enabled: !t.enabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.enabled ? "已下架" : "已上架");
      fetchTemplates();
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDelete = async (t: TplRow) => {
    if (
      !window.confirm(
        `确定删除模板「${t.title}」？已发布的模板建议下架而非删除（下架后市场页不再展示）。`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/templates?id=${t.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "删除失败");
      }
      toast.success("模板已删除");
      if (editingId === t.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      fetchTemplates();
    } catch (err) {
      toast.error(`删除失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const startEdit = (t: TplRow) => {
    setEditingId(t.id);
    setForm(toForm(t));
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

  return (
    <div className="space-y-4">
      {/* 模板列表 */}
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          还没有模板，用下方表单创建第一条
        </p>
      ) : (
        templates.map((t) => (
          <div
            key={t.id}
            className={`flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/30 ${
              editingId === t.id ? "ring-2 ring-violet-300" : ""
            }`}
          >
            <span className="text-xl leading-none">{t.emoji}</span>
            <span className="text-sm font-medium">{t.title}</span>
            <Badge variant="outline" className="border-violet-500/30 text-violet-600">
              {GENRE_META[t.genre]?.name || t.genre}
            </Badge>
            {t.layoutType === "page" && (
              <Badge variant="secondary" className="text-xs">
                页漫
              </Badge>
            )}
            {t.enabled ? (
              <Badge className="bg-violet-600 text-white text-xs">上架中</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                已下架
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              🔥 {t.useCount} · 排序 {t.sortOrder}
              {t.panelCount ? ` · ${t.panelCount} 格` : ""}
            </span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => toggleEnabled(t)} title={t.enabled ? "下架" : "上架"}>
              <RotateCcw className="h-3 w-3" />
              {t.enabled ? "下架" : "上架"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => startEdit(t)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(t)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))
      )}

      {/* 新增 / 编辑表单 */}
      <div className="rounded-xl border-2 border-dashed border-violet-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-violet-700">
            {editingId ? "✏️ 编辑模板" : "＋ 新建模板"}
          </span>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              取消编辑
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">标题 *</label>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="镜中仙缘" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">一句话简介 *（卡片副标题）</label>
            <input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="修仙废柴偶得神秘古镜…" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">创意文案 *（填入向导，80~160 字为佳）</label>
          <textarea
            className={`${inputCls} h-28 resize-none`}
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder="一个修仙废柴少年在宗门大比中垫底被嘲……"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">题材 *</label>
            <select className={inputCls} value={form.genre} onChange={(e) => set("genre", e.target.value)}>
              {Object.entries(GENRE_META).map(([id, g]) => (
                <option key={id} value={id}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">建议画风</label>
            <select className={inputCls} value={form.style} onChange={(e) => set("style", e.target.value)}>
              <option value="">跟随向导默认</option>
              {Object.entries(STYLE_LABELS).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">建议版式</label>
            <select className={inputCls} value={form.layoutType} onChange={(e) => set("layoutType", e.target.value)}>
              <option value="">跟随向导默认</option>
              <option value="strip">条漫（竖屏）</option>
              <option value="page">页漫（横版）</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">建议格数</label>
            <input className={inputCls} type="number" min={4} max={50} value={form.panelCount} onChange={(e) => set("panelCount", e.target.value)} placeholder="20" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Emoji</label>
            <input className={inputCls} value={form.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={4} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">标签（逗号分隔）</label>
            <input className={inputCls} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="热门,逆袭" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">排序（小者靠前）</label>
            <input className={inputCls} type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">状态</label>
            <select
              className={inputCls}
              value={form.enabled ? "1" : "0"}
              onChange={(e) => set("enabled", e.target.value === "1")}
            >
              <option value="1">上架</option>
              <option value="0">下架</option>
            </select>
          </div>
        </div>

        {/* 渐变主题选择（点击色块切换） */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">卡片渐变主题</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TEMPLATE_GRADIENTS).map(([key, cls]) => (
              <button
                key={key}
                type="button"
                title={key}
                onClick={() => set("grad", key)}
                className={`w-14 h-8 rounded-lg bg-gradient-to-br ${cls} border transition ${
                  form.grad === key ? "border-violet-500 ring-2 ring-violet-200" : "border-gray-200 hover:border-violet-300"
                }`}
              />
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-violet-600 hover:bg-violet-700"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 保存中…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> {editingId ? "保存修改" : "创建模板"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
