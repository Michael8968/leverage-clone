
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
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  email: z.string().email({ message: '请输入有效的邮箱地址。' }),
  password: z.string().min(6, { message: '密码至少需要6个字符。' }),
});

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = (values: z.infer<typeof formSchema>) => {
    setError(null);
    startTransition(async () => {
      try {
        const auth = getAuth();
        await signInWithEmailAndPassword(auth, values.email, values.password);
        toast({
          title: '登录成功',
          description: '欢迎回来！即将跳转到主页。',
        });
        router.push('/dashboard');
        router.refresh();
      } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
          setError('邮箱或密码不正确，请重试。');
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
            <h1 className="font-headline text-3xl">Leverage&nbsp;力维利治</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">登录</CardTitle>
                <CardDescription>欢迎回来，请输入您的凭据以继续。</CardDescription>
            </Header>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6">
                        {error && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>登录失败</AlertTitle>
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
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            登录
                        </Button>
                    </form>
                </Form>
                 <div className="mt-6 text-center text-sm">
                    还没有账户？{' '}
                    <Link href="/register" className="underline">
                        立即注册
                    </Link>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
