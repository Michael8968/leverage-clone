
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';

const loginSchema = z.object({
  email: z.string().email({ message: '请输入有效的邮箱地址' }),
  password: z.string().min(1, { message: '密码不能为空' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const loginWithEmail = useAuthStore((state) => state.loginWithEmail);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      // This now uses the Zustand store's login method, which handles
      // the Firebase/TCB logic internally based on the environment.
      await loginWithEmail(data.email, data.password);
      
      toast({
        title: '登录成功',
        description: '欢迎回来！正在跳转到工作台...',
      });
      
      // Redirect to the dashboard after successful login.
      // The auth listener in the layout will handle the user state update.
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Login failed:", error);
      // Handle specific Firebase errors for better UX
      let description = '发生未知错误，请稍后重试';
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            description = '邮箱或密码不正确';
            break;
          case 'auth/too-many-requests':
            description = '尝试次数过多，请稍后重试';
            break;
        }
      }
      toast({
        variant: 'destructive',
        title: '登录失败',
        description: description,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">登录</CardTitle>
          <CardDescription>
            输入您的邮箱和密码以继续
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} />
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
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '登录中...' : '登录'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            还没有账户？{" "}
            <Link href="/signup" className="underline">
              注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
