import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "待办任务管理",
  description: "一个简洁高效的待办任务管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}