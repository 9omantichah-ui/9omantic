import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ActionFlow · 行动秩序",
  description: "随手记录，灵活规划，高效执行",
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