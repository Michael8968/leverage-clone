
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
import { collection, doc, getCountFromServer, writeBatch, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Role, User } from '@/store/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Demand, ProductService, Supplier } from '@/lib/types';
import type { Designer } from '@/app/designers/page';

const formSchema = z.object({
  email: z.string().email({ message: '请输入有效的邮箱地址。' }),
  password: z.string().min(6, { message: '密码至少需要6个字符。' }),
  confirmPassword: z.string(),
  role: z.enum(['user', 'supplier', 'creator', 'admin'], { required_error: '请选择一个角色。'}),
}).refine(data => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致。',
  path: ['confirmPassword'],
});

const seedInitialData = async () => {
    console.log('Checking if initial data seeding is needed...');

    const designersRef = collection(db, 'designers');
    const demandsRef = collection(db, 'demands');
    const productsRef = collection(db, 'products');
    const suppliersRef = collection(db, 'suppliers');
    
    const designersSnap = await getCountFromServer(designersRef);
    const demandsSnap = await getCountFromServer(demandsRef);
    const productsSnap = await getCountFromServer(productsRef);
    const suppliersSnap = await getCountFromServer(suppliersRef);

    const isSeedingNeeded = designersSnap.data().count === 0 || demandsSnap.data().count === 0 || productsSnap.data().count === 0 || suppliersSnap.data().count === 0;

    if (!isSeedingNeeded) {
        console.log('Initial data already exists. Skipping seed.');
        return;
    }
    
    console.log('Seeding initial data...');
    const batch = writeBatch(db);

    // Seed Designers
    if (designersSnap.data().count === 0) {
        const designersData: Omit<Designer, 'id'>[] = [
            { name: '未来造物者', avatar: 'https://picsum.photos/seed/designer1/80/80', description: '探索未知，用前卫的设计语言构想明日世界。', tags: ['科幻', '实验性', '3D打印'], status: '在线' },
            { name: '国风传承者', avatar: 'https://picsum.photos/seed/designer2/80/80', description: '致力于将传统中国元素注入现代设计，讲述东方故事。', tags: ['中国风', '水墨', '传统纹样'], status: '在线' },
            { name: '极简造物主', avatar: 'https://picsum.photos/seed/designer3/80/80', description: '信奉“少即是多”，用最纯粹的线条和形式打造永恒的设计。', tags: ['极简主义', '工业设计', '几何'], status: '离线' },
            { name: '游戏美术师', avatar: 'https://picsum.photos/seed/designer4/80/80', description: '构建虚拟世界的视觉艺术家，专注于角色与场景设计。', tags: ['游戏美术', '角色设计', '概念艺术'], status: '在线' }
        ];
        designersData.forEach(designer => {
            const docRef = doc(collection(db, 'designers'));
            batch.set(docRef, designer);
        });
    }

    // Seed Demands
    if (demandsSnap.data().count === 0) {
        const demandsData: Omit<Demand, 'id' | 'createdAt'>[] = [
            { title: '企业需要一个智能茶杯，要求是赛博朋克风', budget: 50000, category: '礼品定制', status: '开放中', tags: ['企业礼品', '智能硬件', '赛博朋克'] },
            { title: '为新游戏设计一套科幻风格的UI', budget: 25000, category: '3D设计', status: '开放中', tags: ['UI/UX', '游戏设计', '科幻'] },
            { title: '寻找一款适合送给程序员男友的生日礼物', budget: 1500, category: '礼品定制', status: '进行中', tags: ['生日礼物', '程序员', '创意'] },
            { title: '需要定制一批带有公司Logo的环保袋', budget: 8000, category: '日用商品', status: '已完成', tags: ['环保袋', '公司周边'] }
        ];
        demandsData.forEach(demand => {
            const docRef = doc(collection(db, 'demands'));
            batch.set(docRef, { ...demand, createdAt: new Date() });
        });
    }

     // Seed Suppliers
    if (suppliersSnap.data().count === 0) {
        const suppliersData: Omit<Supplier, 'id'>[] = [
            { name: '创新科技', category: '智能家居', matchScore: 95, recommendation: '在智能硬件和物联网领域有很强的创新能力，非常适合平台的高端定制需求。' },
            { name: '东方造物', category: '文创礼品', matchScore: 88, recommendation: '擅长将传统文化与现代美学结合，产品有独特的艺术价值。' },
            { name: '极简生活', category: '家居用品', matchScore: 82, recommendation: '专注于高质量和简约设计，符合追求生活品质的用户群体。' },
        ];
        suppliersData.forEach(supplier => {
            const docRef = doc(collection(db, "suppliers"));
            batch.set(docRef, supplier);
        });
    }

    // Seed Products
    if (productsSnap.data().count === 0) {
        const productsData: Omit<ProductService, 'id'>[] = [
            { name: '磁悬浮蓝牙音箱', description: '采用磁悬浮技术，可在空中自动悬浮并360度旋转播放音乐，充满未来科技感。', price: 1299, category: '消费电子产品', purchaseUrl: 'https://example.com', sku: 'TECH-001', supplierId: 'supplier-01' },
            { name: '智能温控马克杯', description: '通过App精确控制饮品温度，并可在杯身显示自定义图案或文字。', price: 599, category: '智能家居', purchaseUrl: 'https://example.com', sku: 'HOME-002', supplierId: 'supplier-01' },
            { name: '模块化机械键盘', description: '用户可自由更换轴体、键帽和外壳，打造独一无二的个性化键盘。', price: 899, category: '电脑外设', purchaseUrl: 'https://example.com', sku: 'PC-003', supplierId: 'supplier-01' },
            { name: '榫卯结构实木小凳', description: '采用中国传统榫卯工艺，无需一颗螺丝即可稳固组装，体验古代工匠智慧。', price: 450, category: '家居用品', purchaseUrl: 'https://example.com', sku: 'FURN-004', supplierId: 'supplier-02' },
        ];
         productsData.forEach(product => {
            const docRef = doc(collection(db, "products"));
            batch.set(docRef, product);
        });
    }

    await batch.commit();
    console.log('Initial data seeded successfully.');
};


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
        // 1. Check if this is the first user ever
        const usersCollection = collection(db, 'users');
        const userCountSnap = await getCountFromServer(usersCollection);
        const isFirstUser = userCountSnap.data().count === 0;
        
        // 2. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const firebaseUser = userCredential.user;

        if (firebaseUser) {
            // 3. Create user document in Firestore
            const newUser: User = {
                id: firebaseUser.uid,
                email: values.email,
                role: values.role as Role,
                name: values.email.split('@')[0], // Default name
                avatar: `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            
            // 4. Seed initial data if it's the first user
            if (isFirstUser) {
                await seedInitialData();
            }

            toast({
              title: '注册成功',
              description: '您的账户已创建，即将自动登录。',
            });
        }

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
