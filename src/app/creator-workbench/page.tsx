
'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth';
import { Construction, Frown, Bot, Loader2 } from 'lucide-react';
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
import type { Demand } from '@/lib/types';
import { DemandList } from '@/components/features/demand-list';


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
        <CardTitle className="font-headline">3D AI 创作</CardTitle>
        <CardDescription>输入文本提示，利用AI快速生成3D模型参考。</CardDescription>
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
                    <Input placeholder="例如：一辆未来主义的赛博朋克风格摩托车" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2" />}
              生成
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">任务与需求</CardTitle>
        <CardDescription>浏览平台上的公开需求，接受你感兴趣的任务。</CardDescription>
      </CardHeader>
      <CardContent>
        <DemandList demands={demands} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}


function CreatorWorkbench() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-headline font-bold mb-4">创意者工作台</h1>
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">任务与需求</TabsTrigger>
          <TabsTrigger value="3d-creation">3D AI 创作</TabsTrigger>
          <TabsTrigger value="submissions">我的提交</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
         <TasksTab />
        </TabsContent>
        <TabsContent value="3d-creation">
          <CreationForm />
        </TabsContent>
        <TabsContent value="submissions">
           <Card>
            <CardHeader>
              <CardTitle className="font-headline">我的提交</CardTitle>
              <CardDescription>管理你已提交并被采纳的作品。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <Construction className="w-16 h-16 mb-4" />
                <p>作品管理功能正在开发中。</p>
              </div>
            </CardContent>
          </Card>
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
