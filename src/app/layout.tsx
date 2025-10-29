import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers/providers";
import { cn } from "@/lib/utils";
import "./globals.css";
import FirebaseErrorListener from "@/components/FirebaseErrorListener";

const fontSans = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans" 
});

const fontHeadline = Space_Grotesk({ 
  subsets: ["latin"], 
  variable: "--font-headline" 
});

export const metadata: Metadata = {
  title: "Leverage | AI 智能匹配平台",
  description: "一个连接创意者、供应商和用户的 AI 智能匹配平台，旨在高效地将创意转化为现实。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontHeadline.variable
        )}
      >
        <Providers>
            {children}
            <FirebaseErrorListener />
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
