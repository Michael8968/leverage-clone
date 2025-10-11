

'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';

import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { User } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, { message: "姓名必须至少包含2个字符。" }),
  email: z.string().email({ message: "请输入有效的电子邮件地址。" }),
  password: z.string().min(6, { message: "密码必须至少包含6个字符。" }),
  role: z.enum(["user", "creator", "supplier"], { required_error: "请选择一个角色。" }),
  gender: z.enum(["male", "female", "other"], { required_error: "请选择您的性别。" }),
  acceptedTerms: z.boolean().default(false).refine(val => val === true, {
    message: '您必须同意用户服务协议和隐私政策才能继续。'
  })
});

const USER_SESSION_KEY = 'user_session';

const getRedirectPath = (role: string | null) => {
  if (role === 'admin') { // Should not happen on register, but for safety
      return '/demand-pool';
  }
  return '/dashboard'; // Default for 'user', 'creator', 'supplier'
};

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser } = useAuthStore();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: "",
        email: "",
        password: "",
        acceptedTerms: false,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        // 1. 使用 Firebase Authentication 创建新用户
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const firebaseUser = userCredential.user;

        // 2. 在 Firestore 的 users 集合中创建对应的用户文档
        const userPayload: Omit<User, 'uid' | 'createdAt' | 'last_level_check'> & { uid: string, signup_date: any, total_llm_calls: number, last_level_check: any, createdAt: any } = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            name: values.name,
            role: values.role,
            gender: values.gender,
            avatar: `https://avatar.iran.liara.run/public/${values.gender === 'female' ? 'girl' : 'boy'}?username=${encodeURIComponent(values.name)}`,
            status: 'active',
            // New fields for points system
            points_balance: 1000, // Default starting points
            level: 'New',
            signup_date: serverTimestamp(),
            last_level_check: serverTimestamp(),
            total_llm_calls: 0,
            createdAt: serverTimestamp(), // Keep original createdAt field
        };
        
        await setDoc(doc(db, "users", firebaseUser.uid), userPayload);
        
        // 3. 更新全局状态并存储会话
        const finalUserData = {
            ...userPayload,
            signup_date: new Date(),
            createdAt: new Date(),
            last_level_check: new Date(),
        };

        setUser(finalUserData, values.role);
        sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify({ user: finalUserData, role: values.role }));

        toast({
          title: "注册成功",
          description: `欢迎您, ${values.name}！已为您自动登录并跳转。`,
        });

        // 4. 根据真实角色，直接跳转到对应的最终主页
        const redirectPath = getRedirectPath(values.role);
        router.push(redirectPath);

      } catch (error: any) {
        console.error("Registration failed:", error);
        let description = "注册过程中发生未知错误。";
        if (error.code === 'auth/email-already-in-use') {
          description = "该电子邮件地址已被注册。";
        }
        toast({
          title: "注册失败",
          description,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-2xl font-headline font-semibold whitespace-nowrap">
            <Logo />
            <h1>Leverage</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">创建您的账户</CardTitle>
            <CardDescription>加入平台，开启智能匹配之旅。</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label>姓名</Label>
                      <FormControl>
                        <Input placeholder="您的称呼" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <Label>您的角色</Label>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择您的身份" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">用户</SelectItem>
                            <SelectItem value="creator">创意者</SelectItem>
                            <SelectItem value="supplier">供应商</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <Label>性别</Label>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择您的性别" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">男</SelectItem>
                            <SelectItem value="female">女</SelectItem>
                             <SelectItem value="other">其他</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <FormField
                  control={form.control}
                  name="acceptedTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                       <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-xs">
                          我已阅读并同意
                          <Link href="/terms-of-service" target="_blank" className="text-primary underline hover:text-primary/80">
                            《问视间平台用户服务协议》
                          </Link>
                          和
                          <Link href="/privacy-policy" target="_blank" className="text-primary underline hover:text-primary/80">
                            《问视间平台隐私政策》
                          </Link>
                          。
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "创建账户"}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center text-sm">
              已经有账户了？{" "}
              <Link href="/login" className="underline">
                立即登录
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
