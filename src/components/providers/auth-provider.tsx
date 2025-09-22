'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/store/auth';

/**
 * AuthProvider 的唯一职责:
 * 在应用加载时，静默地监听 Firebase 的认证状态，
 * 并将被动获取到的用户信息同步到 Zustand 全局状态。
 * 它不执行任何主动的路由跳转。
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          setUser(userData, userData.role);
        } else {
          // 用户存在于 Auth，但不存在于 Firestore，这是一个异常状态，强制登出。
          console.warn(`Firestore 中未找到 UID: ${firebaseUser.uid} 的用户文档。正在强制登出。`);
          await auth.signOut();
          setUser(null, null);
        }
      } else {
        setUser(null, null);
      }
      setIsLoading(false);
    });

    // 组件卸载时，取消监听以防止内存泄漏。
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组确保此 effect 仅在挂载时运行一次。

  return <>{children}</>;
}
