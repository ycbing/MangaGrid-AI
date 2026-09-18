"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Loader2, MailCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "请求失败");
        return;
      }
      setSent(true);
      if (data.actionLink) {
        setActionLink(data.actionLink);
        toast.success("已发送重置邮件（开发环境，见下方链接）");
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!actionLink) return;
    try {
      await navigator.clipboard.writeText(actionLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-dark">
      <Card className="w-full max-w-sm bg-card/80 backdrop-blur border-border/50">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
              漫格 MangaGrid
            </span>
          </Link>
          <CardTitle className="text-xl">忘记密码</CardTitle>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 rounded p-2">{error}</div>
              )}
              <p className="text-sm text-muted-foreground">
                输入注册邮箱，我们将发送一封重置密码邮件。
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="bg-muted/30"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    发送中...
                  </>
                ) : (
                  "发送重置邮件"
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                想起密码了？{" "}
                <Link href="/sign-in" className="text-violet-600 hover:underline">
                  返回登录
                </Link>
              </p>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <MailCheck className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                如果该邮箱已注册，重置密码邮件已发送到 <strong>{email}</strong>，请查收并按邮件指引操作。
              </p>
              {actionLink && (
                <div className="rounded-lg bg-muted/40 p-3 text-left">
                  <p className="text-xs text-muted-foreground mb-2">
                    开发环境（未配置 SMTP）· 模拟重置链接：
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={actionLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-violet-600 hover:underline break-all flex-1"
                    >
                      {actionLink}
                    </a>
                    <Button variant="ghost" size="icon" onClick={copyLink} title="复制链接">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <Link href="/sign-in" className="block">
                <Button variant="outline" className="w-full">返回登录</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
