
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
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth';

const signupSchema = z.object({
  email: z.string().email({ message: '请输入有效的邮箱地址' }),
  password: z.string().min(6, { message: '密码至少需要6位' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const signupWithEmail = useAuthStore((state) => state.signupWithEmail);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      // This now uses the Zustand store's signup method, which handles
      // the Firebase/TCB logic internally based on the environment.
      await signupWithEmail(data.email, data.password);
      
      toast({
        title: '注册成功',
        description: '已为您创建账户，正在登录并跳转...',
      });

      // After signup, Firebase automatically logs the user in.
      // The auth listener in the layout will catch this and sync with the backend.
      // We just need to redirect.
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Signup failed:", error);
      // Handle specific Firebase errors for better UX
      let description = '发生未知错误，请稍后重试';
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            description = '该邮箱地址已被注册';
            break;
          case 'auth/weak-password':
            description = '密码强度不足，请使用更强的密码';
            break;
        }
      }
      toast({
        variant: 'destructive',
        title: '注册失败',
        description: description,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">创建账户</CardTitle>
          <CardDescription>
            输入您的邮箱和密码以注册新账户
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
                {form.formState.isSubmitting ? '创建中...' : '创建账户'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            已经有账户了？{" "}
            <Link href="/login" className="underline">
              登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
