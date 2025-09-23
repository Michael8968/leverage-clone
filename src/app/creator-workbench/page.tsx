'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth';
import { Frown, Bot, Loader2, ArrowRight, Wand2, Send, PackagePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Demand, ProductService } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { generate3dModel, type Generate3dModelOutput } from '@/ai/flows/generate-3d-model';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// =================================================================
// TASKS TAB
// =================================================================
function TasksTab() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();

  const fetchOpenDemands = useCallback(async () => {
    setIsLoading(true);
    try {
      const demandsCollection = collection(db, 'demands');
      const q = query(demandsCollection, where("status", "==", "开放中"));
      const demandSnapshot = await getDocs(q);
      const demandsList = demandSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Demand));
      setDemands(demandsList);
    } catch (error) {
      console.error("Error fetching open demands:", error);
      toast({ title: '加载失败', description: '无法加载任务列表。', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOpenDemands();
  }, [fetchOpenDemands]);

  const handleAcceptTask = async (demandId: string) => {
    if (!user) {
      toast({ title: '错误', description: '您需要登录才能接受任务。', variant: 'destructive' });
      return;
    }
    setAcceptingTaskId(demandId);
    try {
      const demandRef = doc(db, "demands", demandId);
      await updateDoc(demandRef, {
        status: "进行中",
        creatorId: user.uid,
      });
      toast({ title: "任务已接受！", description: "您已成功接受任务，请开始创作吧！" });
      await fetchOpenDemands();
    } catch (error) {
      console.error("Error accepting task:", error);
      toast({ title: '操作失败', description: '接受任务时发生错误，请重试。', variant: 'destructive' });
    } finally {
      setAcceptingTaskId(null);
    }
  };

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
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : demands.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">当前暂无开放的需求。</TableCell>
                    </TableRow>
                ) : (
                    demands.map(demand => (
                        <TableRow key={demand.id}>
                            <TableCell className="font-medium">{demand.title}</TableCell>
                            <TableCell>{demand.category}</TableCell>
                            <TableCell>¥{demand.budget.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleAcceptTask(demand.id)}
                                  disabled={acceptingTaskId === demand.id}
                                >
                                  {acceptingTaskId === demand.id ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                  接受任务
                                </Button>
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

// =================================================================
// 3D AI CREATION TAB
// =================================================================
const submissionSchema = z.object({
    name: z.string().min(3, { message: "名称至少需要3个字符。" }),
    description: z.string().min(10, { message: "描述至少需要10个字符。" }),
    price: z.preprocess(
        (val) => val ? parseFloat(String(val)) : undefined,
        z.number({ invalid_error: "价格必须是一个数字。" }).positive({ message: "价格必须为正数。" })
    ),
    category: z.string().min(2, {message: "请填写一个类别。"})
});


function CreationForm({ onSubmissionSuccess }: { onSubmissionSuccess: () => void }) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, startGeneration] = useTransition();
    const [isSubmitting, startSubmission] = useTransition();
    const [aiResult, setAiResult] = useState<Generate3dModelOutput | null>(null);
    const { toast } = useToast();
    const { user } = useAuthStore();

    const form = useForm<z.infer<typeof submissionSchema>>({
        resolver: zodResolver(submissionSchema),
        defaultValues: { name: "", description: "", price: 100, category: "3D模型" },
    });

    const handleGenerate = () => {
        if (!prompt) {
            toast({ title: '提示', description: '请输入您的创意描述。' });
            return;
        }
        startGeneration(async () => {
            try {
                const result = await generate3dModel(prompt);
                setAiResult(result);
                // Reset submission form when new image is generated
                form.reset();
            } catch (error) {
                console.error("AI generation failed:", error);
                toast({ title: '生成失败', description: 'AI模型创作时发生错误，请稍后重试。', variant: 'destructive' });
            }
        });
    };

    const handleSubmission = (values: z.infer<typeof submissionSchema>) => {
        if (!aiResult || !user) {
            toast({ title: '错误', description: '没有可提交的作品或用户信息丢失。', variant: 'destructive' });
            return;
        }
        startSubmission(async () => {
            try {
                await addDoc(collection(db, "products"), {
                    ...values,
                    imageUrl: aiResult.imageDataUri,
                    creatorId: user.uid,
                    status: '审核中',
                    createdAt: serverTimestamp(),
                });
                toast({ title: '提交成功！', description: '您的作品已提交审核，请在“我的提交”中查看状态。' });
                setAiResult(null);
                setPrompt('');
                onSubmissionSuccess(); // Notify parent to refresh submission list
            } catch (error) {
                console.error("Submission failed:", error);
                toast({ title: '提交失败', description: '保存作品时发生错误，请重试。', variant: 'destructive' });
            }
        });
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">3D AI 创作</CardTitle>
                <CardDescription>输入您的创意描述，AI将为您生成3D模型预览图，完成后可直接提交入库审核。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-2">
                    <Textarea 
                      placeholder="例如：一个悬浮在空中的赛博朋克风格城市，有霓虹灯和飞行汽车..." 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={2}
                    />
                    <Button onClick={handleGenerate} disabled={isGenerating} className="h-auto">
                        {isGenerating ? <Loader2 className="animate-spin"/> : <Wand2/>}
                    </Button>
                </div>
                
                {isGenerating && (
                    <div className="text-center p-8 space-y-4">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
                        <p className="text-muted-foreground">AI 正在全力创作中，请稍候...</p>
                    </div>
                )}
                
                {aiResult && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2"><Bot/> AI 生成结果</h3>
                            <Image src={aiResult.imageDataUri} alt="AI generated model" width={512} height={512} className="rounded-lg border aspect-square object-cover" />
                        </div>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmission)} className="space-y-4 border p-4 rounded-lg h-full flex flex-col">
                                <h3 className="font-semibold flex items-center gap-2"><PackagePlus /> 提交作品入库</h3>
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>作品名称</FormLabel><FormControl><Input placeholder="例如：赛博朋克浮空城" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>作品描述</FormLabel><FormControl><Textarea placeholder="详细描述您的作品..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)}/>
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>建议价格(元)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                  <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>作品类别</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className="flex-grow"></div>
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2"/>}
                                    提交审核
                                </Button>
                            </form>
                        </Form>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =================================================================
// SUBMISSIONS TAB
// =================================================================
function SubmissionsTab({ refreshKey }: { refreshKey: number }) {
    const [submissions, setSubmissions] = useState<ProductService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useAuthStore();

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const q = query(
                    collection(db, 'products'),
                    where("creatorId", "==", user.uid),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(q);
                const subsList = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Handle Firestore Timestamp
                    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                    return { id: doc.id, ...data, createdAt } as ProductService;
                });
                setSubmissions(subsList);
            } catch (error) {
                console.error("Error fetching submissions:", error);
                toast({ title: '加载失败', description: '无法加载您提交的作品列表。', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchSubmissions();
    }, [user, toast, refreshKey]);

    const getStatusBadge = (status?: '审核中' | '已入库' | '需要修改') => {
        switch (status) {
            case '审核中': return <Badge variant="secondary">审核中</Badge>;
            case '已入库': return <Badge className="bg-green-500 hover:bg-green-600">已入库</Badge>;
            case '需要修改': return <Badge variant="destructive">需要修改</Badge>;
            default: return <Badge variant="outline">未知状态</Badge>;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">我的提交</CardTitle>
                <CardDescription>在这里查看您已提交作品的审核状态和历史记录。</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">预览</TableHead>
                            <TableHead>作品名称</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>价格</TableHead>
                            <TableHead>提交于</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 2 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                </TableRow>
                            ))
                        ) : submissions.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">您还没有提交过任何作品。</TableCell>
                            </TableRow>
                        ) : (
                            submissions.map(sub => (
                                <TableRow key={sub.id}>
                                    <TableCell>
                                        {sub.imageUrl && <Image src={sub.imageUrl} alt={sub.name} width={40} height={40} className="rounded-md border aspect-square object-cover" />}
                                    </TableCell>
                                    <TableCell className="font-medium">{sub.name}</TableCell>
                                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                                    <TableCell>¥{sub.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {sub.createdAt ? formatDistanceToNow(sub.createdAt, { addSuffix: true, locale: zhCN }) : 'N/A'}
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

// =================================================================
// Parent Component and Page Entrypoint
// =================================================================
function CreatorWorkbench() {
  const [activeTab, setActiveTab] = useState("tasks");
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);

  const handleSubmissionSuccess = () => {
    // Increment the key to force SubmissionsTab to re-fetch data
    setSubmissionsRefreshKey(prev => prev + 1);
    // Switch to the submissions tab to show the new entry
    setActiveTab("submissions");
  };

  return (
    <div className="p-4 md:p-8">
      <header className='text-center mb-8'>
        <h1 className="text-3xl font-headline font-bold">创意者工作台</h1>
        <p className="text-muted-foreground mt-2">在这里, 您可以接受任务, 响应需求, 并利用AI工具将您的创意变为现实。</p>
      </header>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
          <TabsTrigger value="tasks">任务与需求</TabsTrigger>
          <TabsTrigger value="3d-creation">3D AI 创作</TabsTrigger>
          <TabsTrigger value="submissions">我的提交</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6"><TasksTab /></TabsContent>
        <TabsContent value="3d-creation" className="mt-6"><CreationForm onSubmissionSuccess={handleSubmissionSuccess}/></TabsContent>
        <TabsContent value="submissions" className="mt-6"><SubmissionsTab refreshKey={submissionsRefreshKey} /></TabsContent>
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
    const { role, isLoading } = useAuthStore();
    const router = useRouter();
    useEffect(() => { if (!isLoading && !role) { router.push('/login'); } }, [role, isLoading, router]);
    if(isLoading) { return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>; }
    if (role !== 'creator') { return <AppLayout><RestrictedAccess /></AppLayout>; }
    return <AppLayout><CreatorWorkbench /></AppLayout>;
}
