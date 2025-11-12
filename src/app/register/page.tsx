
'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
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

// Firebase 客户端已移除，使用自研 JWT 注册
import { Checkbox } from '@/components/ui/checkbox';
import type { User, RoleGiftsConfig } from '@/lib/types';
import { useTheme } from '@/hooks/useTheme';

const formSchema = z.object({
  name: z.string().min(2, { message: "姓名必须至少包含2个字符。" }),
  email: z.string().email({ message: "请输入有效的电子邮件地址。" }),
  password: z.string().min(6, { message: "密码必须至少包含6个字符。" }),
  role: z.enum(["user", "creator", "supplier", "admin"], { required_error: "请选择一个角色。" }),
  gender: z.enum(["male", "female", "other"], { required_error: "请选择您的性别。" }),
  acceptedTerms: z.boolean().default(false).refine(val => val === true, {
    message: '您必须同意用户服务协议和隐私政策才能继续。'
  }),
  adminKey: z.string().optional(),
});

const getRedirectPath = (role: string | null) => {
  if (role === 'admin') {
      return '/demand-pool';
  }
  return '/dashboard';
};

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser, user: currentUser } = useAuthStore();
  const [isPending, startTransition] = useTransition();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const { theme } = useTheme();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: "",
        email: "",
        password: "",
        acceptedTerms: false,
    },
  });

  // Check if current user is admin OR if this is the first user (no admins exist)
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      setIsAdminMode(true);
      return;
    }

    // Check if any admin exists
    const checkAdminExists = async () => {
      try {
        const res = await fetch('/api/admin/check-exists');
        const data = await res.json();
        if (!data.adminExists) {
          setIsFirstUser(true);
          setIsAdminMode(true); // Allow admin selection for first user
        }
      } catch (error) {
        console.error('Failed to check admin existence:', error);
      }
    };

    checkAdminExists();
  }, [currentUser]);

  // 动态视频源 - 直接从 public 目录加载
  const videoSrc = useMemo(() => {
    switch (theme) {
      case 'dark':
        return '/videos/dark-bg.mp4';
      case 'gradient':
        return '/videos/gradient-bg.mp4';
      case 'light':
      default:
        return '/videos/light-bg.mp4';
    }
  }, [theme]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        // If creating admin user, include auth token
        if (values.role === 'admin' && currentUser?.role === 'admin') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            name: values.name,
            role: values.role,
            gender: values.gender
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || '注册失败');
        const { token, user } = json as { token: string, user: User };

        // If admin created a new user, don't auto-login
        if (values.role === 'admin' && currentUser?.role === 'admin') {
          toast({
            title: "管理员账户创建成功",
            description: `管理员 ${values.name} 已创建。`,
          });
          form.reset();
          return;
        }

        localStorage.setItem('auth_token', token);
        setUser(user, user.role);

        toast({
          title: "注册成功",
          description: `欢迎您, ${values.name}！正在跳转...`,
        });

        // 5. Redirect to the appropriate dashboard
  const redirectPath = getRedirectPath(useAuthStore.getState().role);
        router.push(redirectPath);

      } catch (error: any) {
        console.error("Registration failed:", error);
        let description = "注册过程中发生未知错误。";
        if (error.message.includes('邮箱已注册')) {
          description = "该电子邮件地址已被注册。";
        } else if (error.message.includes('管理员')) {
          description = error.message;
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
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* 视频背景层 - 位于底层 */}
      <video
        key={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover"
        style={{ 
          zIndex: 0,
          filter: 'brightness(0.7)'
        }}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* 半透明遮罩层 */}
      <div 
        className="fixed inset-0 bg-background/30 backdrop-blur-sm" 
        style={{ zIndex: 1 }}
      />

      {/* 注册表单容器 - 浮于视频之上 */}
      <div 
        className="relative flex min-h-screen flex-col items-center justify-center p-4"
        style={{ zIndex: 10 }}
      >
        <div className="mb-8 flex flex-col items-center gap-2 text-2xl font-headline font-semibold whitespace-nowrap">
            <Logo />
            <h1>Leverage</h1>
        </div>
        <Card className="w-full max-w-sm shadow-2xl bg-card">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">
              {isAdminMode ? '创建用户账户' : '创建您的账户'}
            </CardTitle>
            <CardDescription>
              {isAdminMode
                ? '作为管理员，您可以创建新用户或管理员账户。'
                : '加入平台，开启智能匹配之旅。'
              }
            </CardDescription>
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
                            {isAdminMode && <SelectItem value="admin">平台管理员</SelectItem>}
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
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isAdminMode ? "创建账户" : "创建账户")}
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
