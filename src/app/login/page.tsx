
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

import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
        const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
        const firebaseUser = userCredential.user;

        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          await auth.signOut();
          throw new Error("该用户不存在或已被删除。");
        }

        const userData = userDocSnap.data() as User;
        setUser(userData, userData.role);

        toast({
          title: "登录成功",
          description: `欢迎回来, ${userData.name}！正在跳转...`,
        });

        const redirectPath = getRedirectPath(userData.role);
        router.push(redirectPath);

      } catch (error: any) {
        let description = "登录过程中发生未知错误。";
        if (error.code) {
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
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <video
        key="/public/videos/light-bg.mp4"
        className="absolute top-0 left-0 w-full h-full object-cover -z-10"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/public/videos/light-bg.mp4" type="video/mp4" />
      </video>
      <div className="w-full max-w-sm relative z-10">
        <div className="mb-8 flex flex-col items-center gap-2 text-2xl font-headline font-semibold whitespace-nowrap">
            <div className="p-3 rounded-full bg-background/50 backdrop-blur-sm">
              <Logo />
            </div>
            <h1 className="font-headline text-3xl text-white shadow-black [text-shadow:_0_1px_10px_var(--tw-shadow-color)]">Leverage&nbsp;力维利治</h1>
        </div>
        <Suspense fallback={<LoginFormSkeleton />}>
            <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
