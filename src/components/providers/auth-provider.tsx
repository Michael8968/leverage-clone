'use client';

import { useEffect } from 'react';
import { useAuthStore, type User } from '@/store/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
          const userDataFromDb = userDocSnap.data();
          // Create a pure, serializable user object
          const user: User = {
            uid: firebaseUser.uid,
            name: userDataFromDb.name || firebaseUser.displayName || 'Unnamed User',
            email: firebaseUser.email!,
            avatar: userDataFromDb.avatar || firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
            role: userDataFromDb.role || 'user',
          };
          setUser(user, user.role);
        } else {
          // User exists in Auth, but not in Firestore, this is an anomaly state, force logout.
          console.warn(`Firestore document for UID: ${firebaseUser.uid} not found. Forcing logout.`);
          await auth.signOut();
          setUser(null, null);
        }
      } else {
        setUser(null, null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this effect runs only once on mount.

  return <>{children}</>;
}
