"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Loader2, KeyRound, CheckCircle2, XCircle } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("密码至少6位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "重置失败");
        return;
      }
      setDone(true);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <CardContent className="text-center space-y-4">
        <XCircle className="h-12 w-12 text-red-400 mx-auto" />
        <p className="text-sm text-muted-foreground">缺少重置令牌，请从邮件中的链接进入</p>
        <Link href="/forgot-password" className="block">
          <Button variant="outline" className="w-full">重新申请</Button>
        </Link>
      </CardContent>
    );
  }

  if (done) {
    return (
      <CardContent className="text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <p className="text-sm text-muted-foreground">密码重置成功！</p>
        <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => router.push("/sign-in")}>
          前往登录
        </Button>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 rounded p-2">{error}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="password">新密码</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少6位"
            required
            className="bg-muted/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">确认新密码</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="再次输入新密码"
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
              重置中...
            </>
          ) : (
            "确认重置"
          )}
        </Button>
      </form>
    </CardContent>
  );
}

export default function ResetPasswordPage() {
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
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <KeyRound className="h-5 w-5 text-violet-600" /> 重置密码
          </CardTitle>
        </CardHeader>
        <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-violet-400" />}>
          <ResetPasswordContent />
        </Suspense>
      </Card>
    </div>
  );
}
