import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";
import "./globals.css";

// Font configuration as per DESIGN_DOC.md
const fontSans = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans" 
});

const fontHeadline = Space_Grotesk({ 
  subsets: ["latin"], 
  variable: "--font-headline" 
});

export const metadata: Metadata = {
  title: "Leverage 力维利治 | AI 智能匹配平台",
  description: "一个连接创意者、供应商和用户的 AI 智能匹配平台，旨在高效地将创意转化为现实。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontHeadline.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
