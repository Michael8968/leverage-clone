
'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/store/auth';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        const { setUser, setIsLoading } = useAuthStore.getState();
        if (firebaseUser) {
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as User;
              setUser(userData);
            } else {
              console.warn(`User document not found for UID: ${firebaseUser.uid}. Logging out.`);
              await auth.signOut(); // This will re-trigger onAuthStateChanged
            }
          } catch (error) {
            console.error("Error fetching user data from Firestore:", error);
            await auth.signOut(); // This will re-trigger onAuthStateChanged
          } finally {
            setIsLoading(false);
          }
        } else {
          // User is signed out
          setUser(null);
          setIsLoading(false);
        }
      });
      setInitialized(true);
      
      // Cleanup subscription on unmount
      return () => unsubscribe();
    }
  }, [initialized]);

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
