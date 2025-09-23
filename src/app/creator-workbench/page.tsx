

'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth';
import { Frown, Bot, Loader2, ArrowRight, Wand2, Send, PackagePlus, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Demand, ProductService } from '@/lib/types';
import type { Resource } from '../public-resources/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { generate3dModel, type Generate3dModelOutput } from '@/ai/flows/generate-3d-model';
import { generateTripo3dModel } from '@/ai/flows/generate-tripo3d-model';
import { getTripo3dModelStatus } from '@/ai/flows/get-tripo3d-model-status';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';

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
// SUBMISSION FORM (SHARED)
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

function SubmissionForm({ 
    imageUrl, 
    onSubmissionSuccess, 
    toolName 
}: { 
    imageUrl: string; 
    onSubmissionSuccess: () => void;
    toolName: string;
}) {
    const [isSubmitting, startSubmission] = useTransition();
    const { toast } = useToast();
    const { user } = useAuthStore();

    const form = useForm<z.infer<typeof submissionSchema>>({
        resolver: zodResolver(submissionSchema),
        defaultValues: { name: "", description: "", price: 100, category: "3D模型" },
    });

    const handleSubmission = (values: z.infer<typeof submissionSchema>) => {
        if (!imageUrl || !user) {
            toast({ title: '错误', description: '没有可提交的作品或用户信息丢失。', variant: 'destructive' });
            return;
        }
        startSubmission(async () => {
            try {
                await addDoc(collection(db, "products"), {
                    ...values,
                    imageUrl: imageUrl,
                    creatorId: user.uid,
                    status: '审核中',
                    createdAt: serverTimestamp(),
                });
                toast({ title: '提交成功！', description: '您的作品已提交审核，请在“我的提交”中查看状态。' });
                onSubmissionSuccess();
            } catch (error) {
                console.error("Submission failed:", error);
                toast({ title: '提交失败', description: '保存作品时发生错误，请重试。', variant: 'destructive' });
            }
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-6">
            <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Bot/> {toolName} 生成结果</h3>
                <Image src={imageUrl} alt="AI generated model" width={512} height={512} className="rounded-lg border aspect-square object-cover" />
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
    );
}

// =================================================================
// BUILT-IN AI TAB
// =================================================================
function BuiltInGenerator({ onSubmissionSuccess }: { onSubmissionSuccess: () => void }) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, startGeneration] = useTransition();
    const [aiResult, setAiResult] = useState<Generate3dModelOutput | null>(null);
    const { toast } = useToast();

    const handleGenerate = () => {
        if (!prompt) {
            toast({ title: '提示', description: '请输入您的创意描述。' });
            return;
        }
        setAiResult(null);
        startGeneration(async () => {
            try {
                const result = await generate3dModel(prompt);
                setAiResult(result);
            } catch (error) {
                console.error("AI generation failed:", error);
                toast({ title: '生成失败', description: 'AI模型创作时发生错误，请稍后重试。', variant: 'destructive' });
            }
        });
    };
    
    const handleSuccess = () => {
        setAiResult(null);
        setPrompt('');
        onSubmissionSuccess();
    }

    return (
        <div className="space-y-6">
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
            
            {aiResult && <SubmissionForm imageUrl={aiResult.imageDataUri} onSubmissionSuccess={handleSuccess} toolName="内置AI" />}
        </div>
    );
}


// =================================================================
// TRIPO3D AI TAB
// =================================================================
function Tripo3DGenerator({ onSubmissionSuccess }: { onSubmissionSuccess: () => void }) {
    const [personalApiKey, setPersonalApiKey] = useState('');
    const [globalApiKey, setGlobalApiKey] = useState('');
    const [prompt, setPrompt] = useState('');
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskStatus, setTaskStatus] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    // Fetch personal and global API keys on mount
    useEffect(() => {
        const storedKey = localStorage.getItem('tripo3d_api_key');
        if (storedKey) setPersonalApiKey(storedKey);

        const fetchGlobalKey = async () => {
            try {
                const q = query(collection(db, 'resources'), where("name", "==", "Tripo3D API"));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const resource = snapshot.docs[0].data() as Resource;
                    if (resource.apiKey) {
                        setGlobalApiKey(resource.apiKey);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch global Tripo3D API key:", err);
            }
        };
        fetchGlobalKey();
    }, []);

    const handleApiKeyChange = (key: string) => {
        setPersonalApiKey(key);
        localStorage.setItem('tripo3d_api_key', key);
    };

    const pollTaskStatus = useCallback(async (currentTaskId: string, currentApiKey: string) => {
        const interval = setInterval(async () => {
            try {
                const data = await getTripo3dModelStatus({ taskId: currentTaskId, apiKey: currentApiKey });
                setTaskStatus(data);

                if (data.status === 'success' || data.status === 'failed') {
                    clearInterval(interval);
                    if(data.status === 'success') {
                        setTaskId(null); // Clear task ID for next generation
                    } else {
                        setError(data.error || '任务生成失败，请检查提示词或API Key。');
                    }
                }
            } catch (err: any) {
                setError(err.message || 'Failed to fetch task status');
                clearInterval(interval);
            }
        }, 5000); // Poll every 5 seconds
        return interval;
    }, []);

    const handleGenerate = async () => {
        const apiKeyToUse = personalApiKey || globalApiKey;

        if (!prompt) {
            toast({ title: '提示', description: '请输入您的创意描述。' });
            return;
        }
        if (!apiKeyToUse) {
            toast({ title: '需要API Key', description: '请在下方输入您的个人API Key，或等待管理员配置平台全局Key。', variant: 'destructive' });
            return;
        }

        setError(null);
        setTaskStatus(null);
        setTaskId('generating');

        try {
            const data = await generateTripo3dModel({ prompt, apiKey: apiKeyToUse });
            if (data.task_id) {
                setTaskId(data.task_id);
                // Immediately start polling
                const initialStatus = await getTripo3dModelStatus({ taskId: data.task_id, apiKey: apiKeyToUse });
                setTaskStatus(initialStatus);
                pollTaskStatus(data.task_id, apiKeyToUse);
            } else {
                throw new Error("API did not return a task_id.");
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create generation task.');
            setTaskId(null);
        }
    };
    
    const handleSuccess = () => {
        setTaskStatus(null);
        setPrompt('');
        onSubmissionSuccess();
    }

    const isGenerating = taskId !== null;

    return (
        <div className="space-y-6">
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Tripo3D 集成</AlertTitle>
                <AlertDescription>
                    此功能使用 Tripo3D API。您可以输入个人 API Key（优先使用），或使用平台管理员配置的全局Key。个人Key将被安全地保存在您的浏览器本地存储中。您可以从 <a href="https://platform.tripo3d.ai/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Tripo3D Platform</a> 获取Key。
                </AlertDescription>
            </Alert>
            <div className="space-y-2">
                <Label htmlFor="tripo-key">个人 Tripo3D API Key (可选)</Label>
                <Input id="tripo-key" type="password" placeholder="sk-..." value={personalApiKey} onChange={(e) => handleApiKeyChange(e.target.value)} />
            </div>
             <div className="flex gap-2">
                <Textarea 
                  placeholder="例如：a sports car, masterpiece, high quality" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={2}
                />
                <Button onClick={handleGenerate} disabled={isGenerating} className="h-auto">
                    {taskId === 'generating' || (isGenerating && taskStatus?.status !== 'success' && taskStatus?.status !== 'failed') ? <Loader2 className="animate-spin"/> : <Wand2/>}
                </Button>
            </div>
            
            {isGenerating && taskStatus && taskStatus.status !== 'success' && taskStatus.status !== 'failed' && (
                 <div className="text-center p-8 space-y-4">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
                    <p className="text-muted-foreground">{taskStatus?.progress ?? 0}% - {taskStatus?.status_message || '正在排队等待处理...'}</p>
                    <Progress value={taskStatus?.progress ?? 0} className="w-full max-w-sm mx-auto" />
                </div>
            )}
            
            {error && <Alert variant="destructive"><AlertTitle>生成出错</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

            {taskStatus?.status === 'success' && taskStatus.output.images?.[0]?.url && (
                <SubmissionForm imageUrl={taskStatus.output.images[0].url} onSubmissionSuccess={handleSuccess} toolName="Tripo3D" />
            )}
        </div>
    );
}

// =================================================================
// Luma AI TAB (Placeholder)
// =================================================================
function LumaAIPlaceholder() {
    return (
        <div className="text-center p-8 space-y-4 border-2 border-dashed rounded-lg">
            <Loader2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="font-headline text-lg">Luma AI 集成</h3>
            <p className="text-muted-foreground">此功能正在开发中，敬请期待。</p>
        </div>
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
                    where("creatorId", "==", user.uid)
                );
                const snapshot = await getDocs(q);
                let subsList = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Firestore Timestamps need to be converted to JS Date objects
                    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                    return { id: doc.id, ...data, createdAt } as ProductService;
                });
                
                // Sort by createdAt date in descending order on the client-side
                subsList.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

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
// 3D AI CREATION TAB (New structure with sub-tabs)
// =================================================================
function CreationsTab({ onSubmissionSuccess }: { onSubmissionSuccess: () => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">3D AI 创作</CardTitle>
                <CardDescription>选择您偏好的创作工具，输入创意描述，AI将为您生成3D模型预览图，完成后可直接提交入库审核。</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="built-in" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="built-in">内置AI模型</TabsTrigger>
                        <TabsTrigger value="tripo3d">Tripo3D</TabsTrigger>
                        <TabsTrigger value="luma">Luma AI</TabsTrigger>
                    </TabsList>
                    <TabsContent value="built-in" className="pt-6">
                        <BuiltInGenerator onSubmissionSuccess={onSubmissionSuccess} />
                    </TabsContent>
                    <TabsContent value="tripo3d" className="pt-6">
                        <Tripo3DGenerator onSubmissionSuccess={onSubmissionSuccess} />
                    </TabsContent>
                    <TabsContent value="luma" className="pt-6">
                        <LumaAIPlaceholder />
                    </TabsContent>
                </Tabs>
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
        <TabsContent value="3d-creation" className="mt-6"><CreationsTab onSubmissionSuccess={handleSubmissionSuccess}/></TabsContent>
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

    

    