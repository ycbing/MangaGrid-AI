"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { COMIC_CREDIT_COSTS } from "@/lib/constants";
import {
  ArrowLeft,
  BookOpen,
  Coins,
  Loader2,
  Plus,
  Clock,
  Sparkles,
  Settings,
  Cpu,
  Zap,
  Gift,
  History,
  User,
  Upload,
  RefreshCw,
  MailCheck,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { RECHARGE_TIERS } from "@/lib/constants";

// 动态导入模型配置组件（避免服务端渲染问题）
const ModelConfigSettings = dynamic(
  () => import("@/components/settings/model-config-settings"),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div> }
);

interface UsageLog {
  id: string;
  type: string;
  creditsUsed: number;
  dramaId: string | null;
  description: string | null;
  createdAt: string;
}

interface CreditInfo {
  balance: number;
  logs: UsageLog[];
}

const TYPE_LABELS: Record<string, string> = {
  comicScript: "📝 生成漫画脚本",
  comicCharRef: "🎭 角色参考图",
  comicPanel: "🖼️ 漫画分格生图",
};

const COST_DISPLAY = [
  { type: "生成漫画脚本", cost: COMIC_CREDIT_COSTS.comicScript, icon: "📝" },
  { type: "角色参考图（每张）", cost: COMIC_CREDIT_COSTS.comicCharRef, icon: "🎭" },
  { type: "漫画分格生图（每格）", cost: COMIC_CREDIT_COSTS.comicPanel, icon: "🖼️" },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"credits" | "model">("credits");
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [selectedTier, setSelectedTier] = useState(0);
  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    emailVerified: string | null;
    createdAt: string;
  } | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/user/credits");
      if (res.ok) {
        const data = await res.json();
        setCreditInfo(data);
      }
    } catch {
      toast.error("加载积分信息失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
      // 静默
    }
  }, []);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        toast.success("头像已更新");
        fetchProfile();
      } else {
        toast.error(data.error || "上传失败");
      }
    } catch {
      toast.error("上传失败，请稍后重试");
    }
  };

  const resendVerify = async () => {
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "验证邮件已发送");
        if (data.actionLink) window.open(data.actionLink, "_blank");
      } else {
        toast.error(data.error || "发送失败");
      }
    } catch {
      toast.error("发送失败，请稍后重试");
    }
  };

  const doRecharge = async () => {
    if (recharging) return;
    setRecharging(true);
    try {
      const res = await fetch("/api/user/credits/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierIndex: selectedTier }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(data.message || "充值成功");
        setRechargeOpen(false);
        setCreditInfo((prev) => (prev ? { ...prev, balance: data.balance } : prev));
      } else {
        toast.error(data.error || "充值失败");
      }
    } catch {
      toast.error("充值失败，请重试");
    } finally {
      setRecharging(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
      return;
    }
    if (status === "authenticated") {
      fetchCredits();
      fetchProfile();
    }
  }, [status, fetchCredits, fetchProfile]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const balance = creditInfo?.balance ?? 0;
  const logs = creditInfo?.logs ?? [];

  return (
    <div className="min-h-screen bg-app">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 h-14 sm:h-16">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] px-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-base sm:text-lg font-bold">账户设置</h1>
          </div>
          {session?.user && (
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
              {session.user.email}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-6">
        {/* Tab 切换 */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
          <button
            onClick={() => setActiveTab("credits")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === "credits"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Coins className="h-4 w-4" />
              积分与账户
            </span>
          </button>
          <button
            onClick={() => setActiveTab("model")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === "model"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Cpu className="h-4 w-4" />
              模型服务
            </span>
          </button>
        </div>

        {activeTab === "credits" ? (
          <>
            {/* Credits balance card */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coins className="h-5 w-5 text-violet-600" />
                  我的积分
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-violet-600">{balance}</p>
                    <p className="text-xs text-muted-foreground mt-1">剩余积分</p>
                  </div>
                  <Button
                    onClick={() => setRechargeOpen(true)}
                    className="bg-violet-600 hover:bg-violet-700 min-h-[44px]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    充值积分
                  </Button>
                </div>

                {balance < 20 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                    ⚠️ 积分不足，建议及时充值以免影响创作
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credit costs reference */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  积分消耗说明
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {COST_DISPLAY.map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span>{item.icon}</span>
                        <span>{item.type}</span>
                      </div>
                      <Badge variant="outline" className="text-violet-600 border-violet-500/30">
                        {item.cost} 积分
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Usage history */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-violet-600" />
                  使用记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>暂无使用记录</p>
                    <p className="text-xs mt-1">开始创作漫画后，使用记录会显示在这里</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm shrink-0">
                            {TYPE_LABELS[log.type] || log.type}
                          </span>
                          {log.description && (
                            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                              {log.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm text-red-400">
                            -{log.creditsUsed}
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline w-28 text-right">
                            {new Date(log.createdAt).toLocaleString("zh-CN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account info */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5 text-violet-600" /> 账户信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* 头像 */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-border/60 bg-muted/40 flex items-center justify-center shrink-0">
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={onAvatarChange}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm" className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      {profile?.avatarUrl ? "更换头像" : "上传头像"}
                    </Button>
                  </label>
                </div>
                <Separator className="bg-border/50" />
                {/* 邮箱 + 验证状态 */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">邮箱</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{session?.user?.email || "-"}</span>
                    {profile?.emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 shrink-0">
                        <ShieldCheck className="h-3.5 w-3.5" /> 已验证
                      </span>
                    ) : (
                      <button
                        onClick={resendVerify}
                        className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline shrink-0"
                      >
                        <MailCheck className="h-3.5 w-3.5" /> 未验证 · 重新发送
                      </button>
                    )}
                  </div>
                </div>
                <Separator className="bg-border/50" />
                {/* 昵称 */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">昵称</span>
                  <span>{profile?.name || session?.user?.name || "-"}</span>
                </div>
                <Separator className="bg-border/50" />
                {/* 注册时间 */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">注册时间</span>
                  <span>
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("zh-CN")
                      : "-"}
                  </span>
                </div>
                <Separator className="bg-border/50" />
                {/* 修改密码 */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">登录密码</span>
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-1 text-violet-600 hover:underline"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> 修改密码
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* 模型服务配置 */
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-5 w-5 text-violet-600" />
                模型服务配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ModelConfigSettings />
            </CardContent>
          </Card>
        )}
      </main>

      {/* 积分充值弹窗（模拟支付） */}
      <Dialog open={rechargeOpen} onOpenChange={(o) => !o && setRechargeOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-violet-600" />
              充值积分
            </DialogTitle>
            <DialogDescription>
              选择充值档位，当前为模拟支付，点击确认即到账。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 py-1">
            {RECHARGE_TIERS.map((tier, i) => (
              <button
                key={i}
                onClick={() => setSelectedTier(i)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                  selectedTier === i
                    ? "border-violet-500 bg-violet-50/70 ring-2 ring-violet-200"
                    : "border-gray-200 bg-white hover:border-violet-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-violet-200">
                    {tier.credits}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{tier.credits} 积分</div>
                    {tier.bonus ? (
                      <div className="text-xs text-violet-600 flex items-center gap-0.5">
                        <Gift className="h-3 w-3" /> 赠送 {tier.bonus} 积分
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">无赠送</div>
                    )}
                  </div>
                </div>
                <div className="text-lg font-bold text-violet-700">¥{tier.price}</div>
              </button>
            ))}
            <div className="pt-1 text-xs text-muted-foreground flex items-center gap-1">
              <History className="h-3.5 w-3.5" />
              到账积分 = 档位积分 + 赠送积分，充值记录可在下方查看
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                取消
              </button>
            </DialogClose>
            <button
              onClick={doRecharge}
              disabled={recharging}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {recharging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {recharging
                ? "支付中…"
                : `确认支付 ¥${RECHARGE_TIERS[selectedTier]?.price ?? 0}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
