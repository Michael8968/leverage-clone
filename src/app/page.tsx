
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/store/auth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 辅助函数：根据角色获取跳转路径
const getRedirectPath = (role: string | null) => {
    if (role === 'admin') {
        return '/demand-pool'; // 修复：添加了缺失的 '/'
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
  const { role, isLoading, setUser, setIsLoading } = useAuthStore();
  const { toast } = useToast();
  
  // 关键：在useEffect中设置Firebase监听器
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 用户已登录
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as User;
            // 在React组件上下文中调用setState，触发UI更新！
            setUser(userData, userData.role);
          } else {
            console.error(`Firestore user document not found for UID: ${firebaseUser.uid}.`);
            toast({
              title: "登录失败",
              description: "用户数据不存在，请联系管理员检查后台数据库。",
              variant: "destructive",
            });
            // 用户存在于Auth但不存在于Firestore，强制登出
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
        // 用户未登录
        setUser(null, null);
      }
      // 无论登录与否，初始认证流程都已完成
      setIsLoading(false);
    });
    
    // 组件卸载时取消监听
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，确保只在挂载时运行一次

  // 在同一个组件内，另一个useEffect负责路由跳转
  useEffect(() => {
    // 只有在初始加载完成后才执行跳转逻辑
    if (!isLoading) {
      const path = getRedirectPath(role);
      router.replace(path);
    }
  }, [isLoading, role, router]); // 依赖isLoading和role的变化

  // 在认证状态确认前，显示加载动画
  return <InitialLoader />;
}
