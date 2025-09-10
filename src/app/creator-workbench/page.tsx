
'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth';
import { Frown, Bot, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { generate3dModel } from '@/ai/flows/generate-3d-model';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Demand, ProductService } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';


const formSchema = z.object({
  prompt: z.string().min(5, { message: '请输入至少5个字符的提示。' }),
});

function CreationForm() {
  const [isPending, startTransition] = useTransition();
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: '' },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setGeneratedImage(null);
    startTransition(async () => {
      try {
        const result = await generate3dModel(values.prompt);
        setGeneratedImage(result.imageDataUri);
        toast({ title: '成功', description: '3D模型已生成！' });
      } catch (error) {
        console.error('AI generation failed', error);
        toast({
          title: '错误',
          description: 'AI模型生成失败，请稍后再试。',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">3D AI创作引擎</CardTitle>
        <CardDescription>
          基于 Tripo Studio 的下一代 AI 3D 生成技术，请在下方输入您的创意描述。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="例如: 一只正在看书的赛博朋克风格的猫,戴着眼镜,背景是下雨的东京街头。" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2" />}
              生成 3D 模型
            </Button>
          </form>
        </Form>
        {isPending && (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <Loader2 className="w-16 h-16 animate-spin mb-4 text-accent" />
            <p>AI正在创作中，请稍候...</p>
          </div>
        )}
        {generatedImage && (
          <div className="mt-4 aspect-square relative rounded-lg overflow-hidden border">
            <Image src={generatedImage} alt="Generated 3D Model" fill className="object-cover" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TasksTab() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOpenDemands = async () => {
      setIsLoading(true);
      try {
        const demandsCollection = collection(db, 'demands');
        const q = query(demandsCollection, where("status", "==", "开放中"));
        const demandSnapshot = await getDocs(q);
        const demandsList = demandSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Demand));
        setDemands(demandsList);
      } catch (error) {
        console.error("Error fetching open demands:", error);
        toast({
          title: '加载失败',
          description: '无法加载任务列表，请稍后重试。',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchOpenDemands();
  }, [toast]);

  const getStatusBadge = (status: Demand['status']) => {
    switch (status) {
      case '开放中':
        return <Badge variant="default">开放中</Badge>;
      case '进行中':
         return <Badge variant="secondary">进行中</Badge>;
      case '已完成':
        return <Badge variant="outline">已完成</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">任务需求池</CardTitle>
        <CardDescription>查看平台发布的任务以及开放的需求，选择您感兴趣的进行创作。</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>任务标题</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>酬金</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : demands.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                        暂无开放的需求。
                        </TableCell>
                    </TableRow>
                ) : (
                    demands.map(demand => (
                        <TableRow key={demand.id}>
                            <TableCell className="font-medium">{demand.title}</TableCell>
                            <TableCell>{demand.category}</TableCell>
                            <TableCell>¥{demand.budget.toLocaleString()}</TableCell>
                            <TableCell>{getStatusBadge(demand.status)}</TableCell>
                            <TableCell className="text-right">
                                {demand.status === '开放中' && (
                                    <Button variant="ghost" size="sm" disabled>
                                        接受任务
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SubmissionsTab() {
  const [submissions, setSubmissions] = useState<ProductService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSubmissions = async () => {
        setIsLoading(true);
        try {
            // A creator's submissions are essentially products in the database
            const productsCollection = collection(db, 'products');
            const productSnapshot = await getDocs(productsCollection);
            const productsList = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductService));
            setSubmissions(productsList);
        } catch (error) {
            console.error("Error fetching submissions:", error);
            toast({
                title: "加载失败",
                description: "无法从数据库加载提交的作品。",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    fetchSubmissions();
  }, [toast]);


  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已入库':
        return <Badge variant="default">已入库</Badge>;
      case '审核中':
         return <Badge variant="secondary">审核中</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline">我的创意提交</CardTitle>
            <CardDescription>您提交的创意作品将进入供应商产品库，并在此处进行管理。</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>作品名称</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>提交日期</TableHead>
                        <TableHead>状态</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            </TableRow>
                        ))
                    ) : submissions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                            您还没有提交任何作品。
                            </TableCell>
                        </TableRow>
                    ) : (
                        submissions.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell>{format(new Date(), 'yyyy-MM-dd')}</TableCell>
                                <TableCell>{getStatusBadge('审核中')}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}


function CreatorWorkbench() {
  return (
    <div className="p-4 md:p-8">
      <header className='text-center mb-8'>
        <h1 className="text-3xl font-headline font-bold">创意者工作台</h1>
        <p className="text-muted-foreground mt-2">在这里, 您可以接受任务, 响应需求, 并利用AI工具将您的创意变为现实。</p>
      </header>
      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
          <TabsTrigger value="tasks">任务与需求</TabsTrigger>
          <TabsTrigger value="3d-creation">3D AI 创作</TabsTrigger>
          <TabsTrigger value="submissions">我的提交</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6">
         <TasksTab />
        </TabsContent>
        <TabsContent value="3d-creation" className="mt-6">
          <CreationForm />
        </TabsContent>
        <TabsContent value="submissions" className="mt-6">
           <SubmissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}


function RestrictedAccess() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Frown className="w-16 h-16 mb-4 text-destructive"/>
            <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
            <p className="text-muted-foreground">此页面仅对“创意者”角色的用户开放。</p>
        </div>
    );
}

export default function CreatorWorkbenchPage() {
    const { role } = useAuthStore();
    const router = useRouter();

    // In a real app, you might want a more robust solution,
    // but this check is sufficient for demonstration.
    useEffect(() => {
        if (!role) {
            router.push('/login');
        }
    }, [role, router]);


    if (role !== 'creator') {
        return (
            <AppLayout>
                <RestrictedAccess />
            </AppLayout>
        );
    }
    
    return (
        <AppLayout>
            <CreatorWorkbench />
        </AppLayout>
    );
}

    

    