"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, BookOpen, Loader2 } from "lucide-react";

export default function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const verified = searchParams.get("verified");
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Use redirect=true — NextAuth handles the full redirect flow including session cookie
    await signIn("credentials", {
      email,
      password,
      callbackUrl,
    });

    // If signIn returns (shouldn't with redirect=true), show error
    setLoading(false);
    setError("登录失败，请检查邮箱和密码");
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
          <CardTitle className="text-xl">登录</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {verified === "1" && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded p-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                邮箱已验证，请登录
              </div>
            )}
            {errorParam === "invalid_token" && (
              <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded p-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                验证链接已过期，请重新注册
              </div>
            )}
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 rounded p-2">{error}</div>
            )}
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
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                className="bg-muted/30"
              />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-violet-600 hover:underline"
              >
                忘记密码？
              </Link>
            </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              还没有账号？{" "}
              <Link href="/sign-up" className="text-violet-600 hover:underline">
                免费注册
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
