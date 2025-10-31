
'use client';

import { useState, useTransition, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { useEffect } from 'react';

// Firebase 客户端已移除，使用自研 JWT 登录
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  email: z.string().email({ message: "请输入有效的电子邮件地址。" }),
  password: z.string().min(6, { message: "密码必须至少包含6个字符。" }),
});

const getRedirectPath = (role: string | null): string => {
  if (role === 'admin') {
      return '/demand-pool';
  }
  return '/dashboard'; 
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setUser } = useAuthStore();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || '登录失败');
        const { token, user } = json as { token: string, user: User };
        localStorage.setItem('auth_token', token);
        setUser(user, user.role);

        toast({
          title: "登录成功",
          description: `登录成功，正在跳转...`,
        });

  const redirectPath = getRedirectPath(useAuthStore.getState().role);
        router.push(redirectPath);

      } catch (error: any) {
        let description = "登录过程中发生未知错误。";
        if (error?.code) {
          switch (error.code) {
            case 'auth/invalid-credential':
              description = "电子邮件或密码不正确，请重试。";
              break;
            case 'auth/user-not-found':
              description = "该电子邮件地址未注册。";
              break;
            case 'auth/wrong-password':
              description = "密码不正确，请重试。";
              break;
            default:
              description = `发生了一个错误，请稍后重试。 (代码: ${error.code})`;
          }
        } else {
            description = error.message;
        }

        toast({
          title: "登录失败",
          description,
          variant: "destructive",
        });
      }
    });
  };

  return (
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">登录您的账户</CardTitle>
          <CardDescription>输入您的凭据以访问平台。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label>电子邮件</Label>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label>密码</Label>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "登录"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            还没有账户？{" "}
            <Link href="/register" className="underline">
              立即注册
            </Link>
          </div>
          {/* 开发环境快速登录入口（仅在本地开发可见） */}
          <DevQuickLogin />
        </CardContent>
      </Card>
  )
}

function LoginFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  const [videoFallback, setVideoFallback] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
       <video
        key="/videos/light-bg.mp4"
        className="absolute top-0 left-0 w-full h-full object-cover -z-10"
        autoPlay
        loop
        muted
        playsInline
        onError={(e) => {
          console.error('Login video error:', e.nativeEvent);
          console.error('Video error details:', {
            code: e.currentTarget.error?.code,
            message: e.currentTarget.error?.message,
            src: e.currentTarget.src,
            networkState: e.currentTarget.networkState,
            readyState: e.currentTarget.readyState
          });
          setVideoFallback(true);
        }}
        onLoadedData={(e) => {
          console.log('Login video loaded successfully:', {
            src: e.currentTarget.src,
            duration: e.currentTarget.duration,
            videoWidth: e.currentTarget.videoWidth,
            videoHeight: e.currentTarget.videoHeight
          });
        }}
      >
        <source src="/videos/light-bg.mp4" type="video/mp4" />
      </video>

      {/* Fallback gradient background when video fails */}
      {videoFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 -z-10" />
      )}

      <div className="w-full max-w-sm relative z-10">
        <div className="mb-8 flex flex-col items-center gap-2 text-2xl font-headline font-semibold whitespace-nowrap">
            <div className="p-3 rounded-full bg-background/50 backdrop-blur-sm">
              <Logo />
            </div>
            <h1 className="font-headline text-3xl text-white shadow-black [text-shadow:_0_1px_10px_var(--tw-shadow-color)]">Leverage</h1>
        </div>
        <Suspense fallback={<LoginFormSkeleton />}>
            <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}

// 开发专用：快速登录按钮，便于本地测试（仅在 development 环境或 localhost 可见）
function DevQuickLogin() {
  const [accounts, setAccounts] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal && process.env.NODE_ENV !== 'development') return;

    (async () => {
      try {
        const res = await fetch('/api/dev/test-accounts');
        if (!res.ok) return;
        const json = await res.json();
        setAccounts(json.credentials || {});
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleQuickLogin = async (role: string) => {
    const list = accounts[role];
    if (!list || list.length === 0) {
      toast({ title: '未找到测试账号', description: `没有可用的 ${role} 测试账号。`, variant: 'destructive' });
      return;
    }
    const acc = list[0];
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: acc.email, password: acc.password }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || '登录失败');
      const { token, user } = json;
      localStorage.setItem('auth_token', token);
      // update global user store
      (useAuthStore.getState().setUser as any)(user, user.role);
      toast({ title: '快速登录成功', description: `已以 ${role} 身份登录` });
      // redirect
      const redirectPath = getRedirectPath(user.role);
      router.push(redirectPath);
    } catch (e: any) {
      toast({ title: '快速登录失败', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // 只在本地或开发环境展示（生产环境强制禁用）
  if (typeof window === 'undefined') return null;
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canShow = isDev || isLocalHost;
  if (!canShow) return null;

  return (
    <div className="mt-4 border-t pt-4 text-sm">
      <p className="text-muted-foreground mb-2">开发调试: 快速登录测试账号</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleQuickLogin('admin')} disabled={loading}>Admin</Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickLogin('creator')} disabled={loading}>Creator</Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickLogin('supplier')} disabled={loading}>Supplier</Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickLogin('user')} disabled={loading}>User</Button>
      </div>
    </div>
  );
}
