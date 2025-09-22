
'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/store/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/store/auth';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { setUser, setIsLoading } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as User;
            setUser(userData, userData.role);
          } else {
            console.error(`Firestore user document not found for UID: ${firebaseUser.uid}.`);
            toast({
              title: "登录失败",
              description: "用户数据不存在，请联系管理员检查后台数据库。",
              variant: "destructive",
            });
            await auth.signOut();
            setUser(null, null);
          }
        } catch (error) {
            console.error("获取用户数据失败:", error);
            toast({
              title: "登录失败",
              description: "获取用户数据时发生错误，请稍后重试。",
              variant: "destructive",
            });
            await auth.signOut();
            setUser(null, null);
        }
      } else {
        setUser(null, null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <html lang="zh-CN">
      <head>
        <title>Leverage 力维利治</title>
        <meta name="description" content="AI 智能匹配平台" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
