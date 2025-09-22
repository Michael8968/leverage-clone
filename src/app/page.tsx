
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/store/auth';
import { Loader2 } from 'lucide-react';

// 辅助函数：根据角色获取跳转路径
const getRedirectPath = (role: string | null) => {
    if (role === 'admin') {
        return '/demand-pool';
    } else if (role) { // All other roles, including 'user', 'creator', 'supplier'
        return '/dashboard';
    }
    return '/login';
};

// 全局加载器
function InitialLoader() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
}

export default function RootPage() {
  const router = useRouter();
  const { user, role, isLoading, setUser, setIsLoading } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  // 监听 Firebase Auth 状态变化
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
             console.warn(`User document not found for UID: ${firebaseUser.uid}. Logging out.`);
             await auth.signOut();
             setUser(null, null);
          }
        } catch (error) {
            console.error("Error fetching user data from Firestore:", error);
            if ((error as any).code === 'unavailable' || (error as any).message.includes('offline')) {
              // This can happen on first load if offline persistence is not yet ready.
              // Let's not log out the user immediately. The UI should show a loading/error state.
              console.warn("Firestore is offline. User data could not be fetched.");
            } else {
              await auth.signOut();
              setUser(null, null);
            }
        } finally {
          setIsLoading(false);
          setAuthChecked(true);
        }
      } else {
        setUser(null, null);
        setIsLoading(false);
        setAuthChecked(true);
      }
    });
    
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 根据认证状态执行路由跳转
  useEffect(() => {
    if (!isLoading && authChecked) {
      const path = getRedirectPath(role);
      router.replace(path);
    }
  }, [isLoading, authChecked, role, router]);


  // 在认证状态检查完成前，显示加载动画
  return <InitialLoader />;
}
