import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "漫格 MangaGrid - AI漫画创作平台 | 从网文到条漫只需5分钟",
  description: "漫格 MangaGrid 是一站式 AI 漫画创作平台。输入创意或小说章节，AI 自动生成漫画脚本、角色卡、分镜生图和对话气泡。支持玄幻、都市、古风等多种题材，零门槛成为漫画家。",
  openGraph: {
    title: "漫格 MangaGrid - AI漫画创作平台",
    description: "输入创意或小说章节，AI 自动生成漫画脚本、角色卡、分镜生图和对话气泡。零门槛成为漫画家。",
    type: "website",
    locale: "zh_CN",
  },
  keywords: ["AI漫画", "漫画创作", "条漫生成", "网文漫改", "AI分镜", "漫画工具"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className="min-h-screen bg-background antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
