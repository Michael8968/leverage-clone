
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
        console.log("[LOGIN_DEBUG] Step 1: Attempting to sign in with Firebase Auth...");
        const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
        const firebaseUser = userCredential.user;
        console.log(`[LOGIN_DEBUG] Step 1 SUCCESS: User authenticated with UID: ${firebaseUser.uid}`);

        console.log("[LOGIN_DEBUG] Step 2: Attempting to fetch user document from Firestore...");
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        console.log(`[LOGIN_DEBUG] Step 2 SUCCESS: Firestore document snapshot received. Document exists: ${userDocSnap.exists()}`);

        if (!userDocSnap.exists()) {
          await auth.signOut();
          throw new Error("User profile not found in the database. Please contact support.");
        }

        const userData = userDocSnap.data() as User;
        console.log("[LOGIN_DEBUG] Step 3: User role found:", userData.role);

        setUser(userData, userData.role);
        console.log("[LOGIN_DEBUG] Step 4: Global state updated.");

        toast({
          title: "登录成功",
          description: `欢迎回来, ${userData.name}！正在跳转...`,
        });

        const redirectPath = getRedirectPath(userData.role);
        console.log(`[LOGIN_DEBUG] Step 5: Redirecting to ${redirectPath}...`);
        router.push(redirectPath);

      } catch (error: any) {
        // ==> CRITICAL DEBUG LOG <==
        console.error("[LOGIN_DEBUG] An error occurred during the login process:", error);
        
        let description = "登录过程中发生未知错误。";
        if (error.code) { // Firebase errors have a 'code' property
          description = `错误代码: ${error.code}. ${error.message}`;
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
      <Card>
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-2xl font-headline font-semibold whitespace-nowrap">
            <Logo />
            <h1 className="font-headline text-3xl">Leverage&nbsp;力维利治</h1>
        </div>
        <Suspense fallback={<LoginFormSkeleton />}>
            <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
