
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Role, User } from '@/store/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  email: z.string().email({ message: '请输入有效的邮箱地址。' }),
  password: z.string().min(6, { message: '密码至少需要6个字符。' }),
  confirmPassword: z.string(),
  role: z.enum(['user', 'supplier', 'creator', 'admin'], { required_error: '请选择一个角色。'}),
}).refine(data => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致。',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user',
    },
  });

  const handleRegister = (values: z.infer<typeof formSchema>) => {
    setError(null);
    startTransition(async () => {
      try {
        // 1. 在 Firebase Auth 中创建用户
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const firebaseUser = userCredential.user;

        // 2. 在 Firestore 中创建用户文档
        const newUser: User = {
            uid: firebaseUser.uid,
            email: values.email,
            role: values.role as Role,
            name: values.email.split('@')[0], // 默认使用邮箱前缀作为名字
            avatar: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`, // 使用一个随机头像
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        
        toast({
          title: '注册成功！',
          description: '您的账户已创建，即将带您进入主页。',
        });
        
        // The redirection is now handled by the root page based on auth state change.
        // No need to call router.push() here.

      } catch (e: any) {
        if (e.code === 'auth/email-already-in-use') {
          setError('该邮箱地址已被注册。');
        } else {
          setError('发生未知错误，请稍后再试。');
          console.error(e);
        }
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-2xl font-headline font-semibold whitespace-nowrap">
            <Logo />
            <h1 className="font-headline text-3xl">创建您的账户</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">注册</CardTitle>
                <CardDescription>加入我们，开启智能匹配与创意生成的旅程。</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>注册失败</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>邮箱</FormLabel>
                                    <FormControl>
                                        <Input placeholder="name@example.com" {...field} />
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
                                        <Input type="password" placeholder="至少6位字符" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>确认密码</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="再次输入密码" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>选择角色</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="选择您希望注册的角色类型" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="user">普通用户 (体验AI购物)</SelectItem>
                                            <SelectItem value="creator">创意者 (承接设计任务)</SelectItem>
                                            <SelectItem value="supplier">供应商 (管理商品和服务)</SelectItem>
                                            <SelectItem value="admin">管理员 (管理平台)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />

                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            创建账户
                        </Button>
                    </form>
                </Form>
                 <div className="mt-6 text-center text-sm">
                    已有账户？{' '}
                    <Link href="/login" className="underline">
                        直接登录
                    </Link>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
