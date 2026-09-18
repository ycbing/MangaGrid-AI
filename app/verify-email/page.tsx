"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

type VerifyState =
  | { status: "pending" }
  | { status: "success"; email: string }
  | { status: "error"; message: string };

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState<VerifyState>({ status: "pending" });

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setState({ status: "error", message: "缺少验证令牌，请从邮件中的链接进入" });
        return;
      }
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!active) return;
        if (res.ok) {
          setState({ status: "success", email: data.email || "" });
        } else {
          setState({ status: "error", message: data.error || "验证失败" });
        }
      } catch {
        if (active) setState({ status: "error", message: "网络异常，请稍后重试" });
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  return (
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
        <CardTitle className="text-xl">邮箱验证</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {state.status === "pending" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
            <p className="text-sm text-muted-foreground">正在验证邮箱...</p>
          </div>
        )}
        {state.status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {state.email ? `${state.email} ` : ""}邮箱验证成功！
            </p>
            <Link href="/sign-in" className="block">
              <Button className="w-full bg-violet-600 hover:bg-violet-700">前往登录</Button>
            </Link>
          </>
        )}
        {state.status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-red-400 mx-auto" />
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Link href="/sign-up" className="block">
              <Button variant="outline" className="w-full">重新注册</Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-dark">
      <Suspense fallback={<Mail className="h-8 w-8 text-violet-400 animate-pulse" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
