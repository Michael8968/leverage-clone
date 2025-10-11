
'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore, type Role } from '@/store/auth';
import { Frown, Bot, Loader2, ArrowRight, Wand2, Send, PackagePlus, Info, UploadCloud, FileImage, CalendarDays, Clock, Trash2, CheckCircle, XCircle, AlertCircle, ToggleLeft, ToggleRight, PlusCircle, Edit, Settings, Star, BrainCircuit, Users, Power, PowerOff, Coins, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, serverTimestamp, getDoc, deleteDoc, Timestamp, setDoc, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Demand, ProductService, LlmConnection, Appointment, Availability, AssistantRule, Prompt, User, PointsTransaction } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { generate3dModel, type Generate3dModelOutput } from '@/ai/flows/generate-3d-model';
import { generateTripo3dModel } from '@/ai/flows/generate-tripo3d-model';
import { getTripo3dModelStatus } from '@/ai/flows/get-tripo3d-model-status';
import { generateNanoBananaImage } from '@/ai/flows/generate-nanobanana-image';
import { getUploadUrlForMediaAsset } from '@/ai/flows/multimodal-flows';
import { updateUserStatus, updateUserAssistantRules } from '@/ai/flows/user-management-flows';
import { getPrompts } from '@/ai/flows/admin-management-flows';


import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui/time-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';



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
// SUBMISSION FORM (SHARED) & HELPERS
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

// Helper to convert Base64 Data URI to a File object
async function dataUriToFile(dataUrl: string, fileName: string): Promise<File> {
    const res: Response = await fetch(dataUrl);
    const blob: Blob = await res.blob();
    return new File([blob], fileName, { type: blob.type });
}


function SubmissionForm({ 
    imageUrl, 
    onSubmissionSuccess, 
    toolName 
}: { 
    imageUrl: string | null; 
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
                // Step 1: Convert Data URI to File and get upload URL
                const fileName = `${values.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
                const imageFile = await dataUriToFile(imageUrl, fileName);

                const { uploadUrl, mediaAssetId } = await getUploadUrlForMediaAsset({
                    userId: user.uid,
                    fileName: imageFile.name,
                    contentType: imageFile.type,
                });

                // Step 2: Upload the file to Firebase Storage
                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: imageFile,
                    headers: { 'Content-Type': imageFile.type },
                });
                
                // Step 3: Construct the final public URL
                const publicUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/media_assets/${user.uid}/${mediaAssetId}-${imageFile.name}`;

                // Step 4: Save the product data with the public URL to Firestore
                await addDoc(collection(db, "products"), {
                    ...values,
                    imageUrl: publicUrl, // <-- Use the public URL from Firebase Storage
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
                <div className="rounded-lg border aspect-square bg-muted/50 flex items-center justify-center">
                    {imageUrl ? (
                        <Image src={imageUrl} alt="AI generated model" width={512} height={512} className="rounded-lg object-cover" />
                    ) : (
                        <p className="text-muted-foreground text-sm">图片加载失败</p>
                    )}
                </div>
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
            
            {aiResult && aiResult.imageDataUri && <SubmissionForm imageUrl={aiResult.imageDataUri} onSubmissionSuccess={handleSuccess} toolName="内置AI" />}
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
                const q = query(collection(db, 'llm_connections'), where("provider", "==", "Tripo3D"), where("status", "==", "活跃"));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const llmConnection = snapshot.docs[0].data() as LlmConnection;
                    if (llmConnection.apiKey) {
                        setGlobalApiKey(llmConnection.apiKey);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch global Tripo3D API key from llm_connections:", err);
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
            const responseData = await generateTripo3dModel({ prompt, apiKey: apiKeyToUse });
            if (responseData.data && responseData.data.task_id) {
                const newTaskId = responseData.data.task_id;
                setTaskId(newTaskId);
                // Immediately start polling
                const initialStatus = await getTripo3dModelStatus({ taskId: newTaskId, apiKey: apiKeyToUse });
                setTaskStatus(initialStatus);
                pollTaskStatus(newTaskId, apiKeyToUse);
            } else {
                throw new Error("API did not return a task_id in the 'data' field.");
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
// Nano-Banana (Gemini 2.5 Flash Image) TAB
// =================================================================
const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

function NanoBananaGenerator({ onSubmissionSuccess }: { onSubmissionSuccess: () => void }) {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isGenerating, startGeneration] = useTransition();
    const [aiResult, setAiResult] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = () => {
        if (!prompt) {
            toast({ title: '提示', description: '请输入您的编辑或创作指令。' });
            return;
        }
        setAiResult(null);
        startGeneration(async () => {
            try {
                let imageDataUri: string | undefined;
                if (imageFile) {
                    imageDataUri = await fileToDataUri(imageFile);
                }
                const result = await generateNanoBananaImage({ prompt, imageDataUri });
                setAiResult(result.imageDataUri);
            } catch (error: any) {
                console.error("Nano-banana generation failed:", error);
                toast({ title: '生成失败', description: error.message || 'AI 模型创作时发生错误，请稍后重试。', variant: 'destructive' });
            }
        });
    };

    const handleSuccess = () => {
        setAiResult(null);
        setPrompt('');
        setImageFile(null);
        setImagePreview(null);
        onSubmissionSuccess();
    };

    return (
        <div className="space-y-6">
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Gemini 2.5 Flash Image (Nano-Banana) 集成</AlertTitle>
                <AlertDescription>
                    此功能使用先进的图像生成模型。您可以上传一张图片作为编辑基础，或者仅通过文本指令进行创作。
                </AlertDescription>
            </Alert>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                    <Label htmlFor="image-upload">原始图片 (可选)</Label>
                    <div className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-4 h-40 flex items-center justify-center text-center">
                        <Input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        {imagePreview ? (
                            <Image src={imagePreview} alt="Image preview" layout="fill" objectFit="contain" className="rounded-md" />
                        ) : (
                            <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                <UploadCloud className="h-8 w-8" />
                                <span>点击或拖拽上传图片</span>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="flex flex-col gap-2">
                    <Label htmlFor="nano-prompt">编辑/创作指令</Label>
                    <Textarea 
                        id="nano-prompt"
                        placeholder="例如：把这只猫变成赛博朋克风格, 加上霓虹灯和机械义肢" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="h-full"
                        rows={5}
                    />
                </div>
            </div>
             <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                {isGenerating ? <Loader2 className="animate-spin mr-2"/> : <Wand2 className="mr-2"/>}
                {isGenerating ? '正在生成中...' : (imagePreview ? '开始编辑' : '开始创作')}
            </Button>
            
            {isGenerating && (
                <div className="text-center p-8 space-y-4">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
                    <p className="text-muted-foreground">AI 图像大模型正在全力创作中，请稍候...</p>
                </div>
            )}
            
            {aiResult && <SubmissionForm imageUrl={aiResult} onSubmissionSuccess={handleSuccess} toolName="Gemini Image" />}
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
            if (!user?.uid) return;
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
                    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
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
// SCHEDULE AND ASSISTANT TAB (NEW)
// =================================================================
function ScheduleAndAssistantTab() {
    const { user, setUser } = useAuthStore();
    const { toast } = useToast();
    
    // UI state
    const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
    const [isRechargeDialogOpen, setIsRechargeDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<AssistantRule | null>(null);
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [availableSlots, setAvailableSlots] = useState<Timestamp[]>([]);
    const [isSlotsLoading, setIsSlotsLoading] = useState(true);
    const [newSlotDate, setNewSlotDate] = useState<Date | undefined>(new Date());
    const [isAddingSlot, setIsAddingSlot] = useState(false);

    const [isTransitioning, startTransition] = useTransition();

    const fetchCreatorData = useCallback(async () => {
        if (!user) return;
        setIsAppointmentsLoading(true);
        setIsSlotsLoading(true);

        try {
            // Fetch prompts
            const promptsData = await getPrompts(null);
            const availablePrompts = promptsData.prompts.filter(p => p.ownerType === 'platform' || p.ownerId === user.uid);
            setPrompts(availablePrompts);

            // Fetch appointments with client-side sorting to avoid index requirement
            const apptQuery = query(collection(db, 'appointments'), where("creatorId", "==", user.uid));
            const apptSnapshot = await getDocs(apptQuery);
            const apptList = apptSnapshot.docs.map(doc => doc.data() as Appointment);
            apptList.sort((a,b) => b.appointmentTime.toMillis() - a.appointmentTime.toMillis());
            setAppointments(apptList);
            setIsAppointmentsLoading(false);

            // Fetch available slots
            const availRef = doc(db, 'availabilities', user.uid);
            const availSnap = await getDoc(availRef);
            if (availSnap.exists()) {
                const data = availSnap.data() as Availability;
                setAvailableSlots(data.slots || []);
            }
            setIsSlotsLoading(false);

        } catch (error) {
            console.error(error);
            toast({ title: "加载失败", description: "无法加载您的排班和预约信息。", variant: "destructive" });
            setIsAppointmentsLoading(false);
            setIsSlotsLoading(false);
        }
    }, [user, toast]);
    
    useEffect(() => {
        fetchCreatorData();
    }, [fetchCreatorData]);

    const handleStatusChange = async (type: 'status' | 'aiAssistantEnabled' | 'alwaysAvailable', value: any) => {
        if (!user) return;
        const optimisticUser = { ...user, [type]: value };
        setUser(optimisticUser, user.role);
        try {
            await updateDoc(doc(db, 'users', user.uid), { [type]: value });
            toast({ title: '状态已更新' });
        } catch (error) {
            toast({ title: '更新失败', variant: 'destructive' });
            setUser(user, user.role); // Revert
        }
    };
    
    const handleSaveRule = async (ruleToSave: AssistantRule) => {
        if (!user) return;
        const currentRules = user.assistantRules || [];
        const index = currentRules.findIndex(r => r.id === ruleToSave.id);
        let newRules;
        if (index > -1) {
            newRules = [...currentRules];
            newRules[index] = ruleToSave;
        } else {
            newRules = [...currentRules, ruleToSave];
        }

        startTransition(async () => {
            try {
                await updateUserAssistantRules({ userId: user.uid, rules: newRules });
                setUser({ ...user, assistantRules: newRules }, user.role);
                toast({ title: '成功', description: `规则“${ruleToSave.name}”已保存。` });
                setIsRuleDialogOpen(false);
                setEditingRule(null);
            } catch (error) {
                toast({ title: '保存失败', description: '保存规则时发生错误。', variant: 'destructive' });
            }
        });
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!user) return;
        const newRules = (user.assistantRules || []).filter(r => r.id !== ruleId);
        startTransition(async () => {
             try {
                await updateUserAssistantRules({ userId: user.uid, rules: newRules });
                setUser({ ...user, assistantRules: newRules }, user.role);
                toast({ title: '成功', description: '规则已删除。' });
            } catch (error) {
                toast({ title: '删除失败', variant: 'destructive' });
            }
        });
    };
    
    const handleAppointmentStatus = async (appointmentId: string, status: 'confirmed' | 'cancelled') => {
        try {
            await updateDoc(doc(db, 'appointments', appointmentId), { status });
            toast({ title: "操作成功", description: `预约已${status === 'confirmed' ? '确认' : '取消'}` });
            fetchCreatorData();
        } catch (error) {
            toast({ title: "操作失败", variant: "destructive" });
        }
    };

    const handleAddSlot = async () => {
        if (!newSlotDate || !user) return;
        setIsAddingSlot(true);
        const newSlotTimestamp = Timestamp.fromDate(newSlotDate);
        try {
            const availRef = doc(db, 'availabilities', user.uid);
            await updateDoc(availRef, { slots: arrayUnion(newSlotTimestamp) });
            setAvailableSlots(prev => [...prev, newSlotTimestamp]);
            toast({ title: '成功', description: '新的空闲时间已添加。' });
        } catch (error) {
             // If doc doesn't exist, create it
            if ((error as any).code === 'not-found') {
                try {
                    await setDoc(doc(db, 'availabilities', user.uid), { slots: [newSlotTimestamp] });
                    setAvailableSlots([newSlotTimestamp]);
                } catch (e) {
                    toast({ title: '失败', variant: 'destructive'});
                }
            } else {
               toast({ title: '失败', variant: 'destructive'});
            }
        } finally {
            setIsAddingSlot(false);
        }
    };

    const handleDeleteSlot = async (slot: Timestamp) => {
        if (!user) return;
        try {
            const availRef = doc(db, 'availabilities', user.uid);
            await updateDoc(availRef, { slots: arrayRemove(slot) });
            setAvailableSlots(prev => prev.filter(s => s.toMillis() !== slot.toMillis()));
            toast({ title: '成功', description: '时间段已删除。' });
        } catch(error) {
            toast({ title: '失败', variant: 'destructive' });
        }
    };
    
    if (!user) return null;

    const assistantRules = (user.assistantRules || []).sort((a, b) => a.priority - b.priority);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="font-headline">在线状态与接待设置</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {user.status === 'active' ? <Power className="w-6 h-6 text-green-500" /> : <PowerOff className="w-6 h-6 text-red-500" />}
                                <div>
                                    <Label htmlFor="online-status" className="font-semibold">在线接待</Label>
                                    <p className="text-xs text-muted-foreground">开启后可接收平台分配的实时请求。</p>
                                </div>
                            </div>
                            <Switch id="online-status" checked={user.status === 'active'} onCheckedChange={(checked) => handleStatusChange('status', checked ? 'active' : 'inactive')} />
                        </Card>
                        <Card className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bot className="w-6 h-6 text-muted-foreground" />
                                <div>
                                    <Label htmlFor="ai-assistant-status" className="font-semibold">默认AI助理</Label>
                                    <p className="text-xs text-muted-foreground">开启后，所有请求将优先由AI助理接待。</p>
                                </div>
                            </div>
                            <Switch id="ai-assistant-status" checked={!!user.aiAssistantEnabled} onCheckedChange={(checked) => handleStatusChange('aiAssistantEnabled', checked)} />
                        </Card>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">我的排班与预约</CardTitle>
                    </CardHeader>
                     <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-medium">可预约时间段</CardTitle>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox id="always-available" checked={!!user.alwaysAvailable} onCheckedChange={(checked) => handleStatusChange('alwaysAvailable', Boolean(checked))} />
                                    <label htmlFor="always-available" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">全时空闲</label>
                                </div>
                            </CardHeader>
                            {!user.alwaysAvailable && (
                                 <CardContent className="space-y-4">
                                    <div>
                                        <Label>添加新时段</Label>
                                        <div className="flex items-center gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newSlotDate && "text-muted-foreground")}>
                                                        <CalendarDays className="mr-2 h-4 w-4" />
                                                        {newSlotDate ? format(newSlotDate, "yyyy-MM-dd") : <span>选择日期</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newSlotDate} onSelect={setNewSlotDate} initialFocus/></PopoverContent>
                                            </Popover>
                                            <TimePicker date={newSlotDate} setDate={setNewSlotDate} />
                                            <Button onClick={handleAddSlot} disabled={isAddingSlot}>{isAddingSlot ? <Loader2 className="animate-spin" /> : "添加"}</Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {isSlotsLoading ? <Skeleton className="h-10 w-full" /> : 
                                         availableSlots.sort((a,b) => a.toMillis() - b.toMillis()).map(slot => (
                                            <div key={slot.toMillis()} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                                 <span className="text-sm">{format(slot.toDate(), 'M月d日 HH:mm')}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteSlot(slot)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                        <Card>
                             <CardHeader><CardTitle className="text-lg font-medium">待处理的预约</CardTitle></CardHeader>
                            <CardContent className="max-h-72 overflow-y-auto">
                                {isAppointmentsLoading ? <Skeleton className="h-20 w-full"/> : 
                                appointments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">暂无预约</p> :
                                <Table>
                                    <TableHeader><TableRow><TableHead>预约人</TableHead><TableHead>时间</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {appointments.map(appt => (
                                            <TableRow key={appt.id}>
                                                <TableCell>{appt.requesterName}</TableCell>
                                                <TableCell className="text-xs">{format(appt.appointmentTime.toDate(), 'MM/dd HH:mm')}</TableCell>
                                                <TableCell>
                                                    {appt.status === 'pending' ? (
                                                        <div className="flex gap-1">
                                                            <Button size="xs" onClick={() => handleAppointmentStatus(appt.id, 'confirmed')}><CheckCircle className="w-3 h-3 mr-1"/>确认</Button>
                                                            <Button size="xs" variant="ghost" onClick={() => handleAppointmentStatus(appt.id, 'cancelled')}><XCircle className="w-3 h-3 mr-1"/>拒绝</Button>
                                                        </div>
                                                    ) : ( <Badge variant={appt.status === 'confirmed' ? 'default' : 'destructive'}>{appt.status}</Badge> )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                }
                            </CardContent>
                        </Card>
                    </div>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="font-headline">高级助理规则</CardTitle>
                            <Button onClick={() => { setEditingRule(null); setIsRuleDialogOpen(true); }}>
                                <PlusCircle className="w-4 h-4 mr-2" /> 新增规则
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>优先级</TableHead><TableHead>规则名称</TableHead><TableHead>触发条件</TableHead><TableHead>执行动作 (提示词)</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {assistantRules.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">暂无高级规则。</TableCell></TableRow>
                                ) : (
                                    assistantRules.map(rule => (
                                        <TableRow key={rule.id}>
                                            <TableCell><Badge>{rule.priority}</Badge></TableCell>
                                            <TableCell className="font-medium">{rule.name}</TableCell>
                                            <TableCell><Badge variant="outline">{(rule.conditions.repetition && rule.conditions.repetition !== 'none') ? '有时间规则' : '无时间规则'}</Badge></TableCell>
                                            <TableCell><Badge variant="secondary">{prompts.find(p => p.promptKey === rule.action.promptKey)?.name || '未知'}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingRule(rule); setIsRuleDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRule(rule.id)}><Trash2 className="w-4 h-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Coins className="w-5 h-5 text-amber-500" /> 我的积分与账单</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center p-6 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">当前积分余额</p>
                            <p className="text-4xl font-bold font-headline">{user?.points_balance?.toLocaleString() || 0}</p>
                        </div>
                         <Button className="w-full" onClick={() => setIsRechargeDialogOpen(true)}>充值积分</Button>
                        <Button variant="outline" className="w-full" onClick={() => setIsHistoryDialogOpen(true)}>
                            <History className="mr-2 h-4 w-4" />
                            查看收支历史
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <RuleDialog
                key={editingRule?.id || 'new'}
                open={isRuleDialogOpen}
                onOpenChange={setIsRuleDialogOpen}
                rule={editingRule}
                onSave={handleSaveRule}
                prompts={prompts}
                isSaving={isTransitioning}
            />
            
            <RechargeDialog open={isRechargeDialogOpen} onOpenChange={setIsRechargeDialogOpen} />
            <BillingHistoryDialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen} />
        </div>
    );
}

// =================================================================
// RECHARGE DIALOG (NEW)
// =================================================================
function RechargeDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>充值积分</DialogTitle>
                    <DialogDescription>
                        功能正在开发中，敬请期待。
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 text-center text-muted-foreground">
                    <p>这里将展示不同的充值选项和支付方式。</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// =================================================================
// BILLING HISTORY DIALOG (NEW & IMPROVED)
// =================================================================
function BillingHistoryDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void}) {
     const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
     const [isLoading, setIsLoading] = useState(false);
     const { user } = useAuthStore();
     const { toast } = useToast();

     useEffect(() => {
        if (open && user) {
            setIsLoading(true);
            const fetchHistory = async () => {
                try {
                    const q = query(collection(db, 'points_transactions'), where('uid', '==', user.uid), orderBy('timestamp', 'desc'));
                    const snapshot = await getDocs(q);
                    const history = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as PointsTransaction));
                    setTransactions(history);
                } catch (error) {
                    toast({ title: "加载失败", description: "无法获取账单历史。", variant: "destructive" });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchHistory();
        }
    }, [open, user, toast]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>收支历史</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>类型</TableHead>
                                <TableHead>金额</TableHead>
                                <TableHead>原因</TableHead>
                                <TableHead>时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow> 
                            : transactions.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center h-24">暂无记录</TableCell></TableRow> 
                            : transactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell><Badge variant="outline">{tx.type}</Badge></TableCell>
                                    <TableCell className={cn(tx.amount > 0 ? "text-green-600" : "text-red-600")}>{tx.amount > 0 ? '+' : ''}{tx.amount}</TableCell>
                                    <TableCell>{tx.reason}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{tx.timestamp ? format(tx.timestamp.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// =================================================================
// ASSISTANT RULE DIALOG (NEW)
// =================================================================
type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAYS_OF_WEEK: { id: DayOfWeek; label: string }[] = [ { id: 'mon', label: '一' }, { id: 'tue', label: '二' }, { id: 'wed', label: '三' }, { id: 'thu', label: '四' }, { id: 'fri', label: '五' }, { id: 'sat', label: '六' }, { id: 'sun', label: '日' } ];
const ALL_ROLES: Role[] = ['admin', 'creator', 'supplier', 'user'];
const ROLE_NAMES: Record<Role, string> = { admin: '管理员', creator: '创意者', supplier: '供应商', user: '普通用户', suspended: '已禁用' };

function RuleDialog({ open, onOpenChange, rule: initialRule, onSave, prompts, isSaving }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rule: AssistantRule | null;
    onSave: (rule: AssistantRule) => void;
    prompts: Prompt[];
    isSaving: boolean;
}) {
    const isEditing = !!initialRule;
    const [rule, setRule] = useState<AssistantRule>(
        initialRule || {
            id: `rule_${Date.now()}`,
            name: '',
            priority: 10,
            conditions: { ruleLogic: 'and' },
            action: { type: 'use_prompt', promptKey: '' }
        }
    );

    useEffect(() => {
        setRule(
            initialRule || {
                id: `rule_${Date.now()}`,
                name: '',
                priority: 10,
                conditions: { ruleLogic: 'and' },
                action: { type: 'use_prompt', promptKey: '' }
            }
        );
    }, [initialRule]);
    
    const { toast } = useToast();
    const handleSave = () => {
        if (!rule.name || !rule.action.promptKey) {
            toast({ title: "信息不完整", description: "规则名称和执行动作不能为空。", variant: "destructive" });
            return;
        }
        onSave(rule);
    };

    const handleConditionChange = (field: keyof AssistantRule['conditions'], value: any) => {
        setRule(prev => ({...prev, conditions: { ...prev.conditions, [field]: value }}));
    };
    
    const handleDayToggle = (day: DayOfWeek) => {
        const currentDays = rule.conditions.daysOfWeek || [];
        const newDays = currentDays.includes(day) ? currentDays.filter(d => d !== day) : [...currentDays, day];
        handleConditionChange('daysOfWeek', newDays);
    };
    
    const handleRoleToggle = (role: Role) => {
        const currentRoles = { ...(rule.conditions.targetUserRoles || {}) };
        if (currentRoles[role]) {
            delete currentRoles[role];
        } else {
            currentRoles[role] = [];
        }
        handleConditionChange('targetUserRoles', currentRoles);
    };

    const handleRatingToggle = (role: Role, rating: number) => {
        const currentRoles = { ...(rule.conditions.targetUserRoles || {}) };
        const currentRatings = currentRoles[role] || [];
        const newRatings = currentRatings.includes(rating) ? currentRatings.filter(r => r !== rating) : [...currentRatings, rating];
        currentRoles[role] = newRatings;
        handleConditionChange('targetUserRoles', currentRoles);
    };
    
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-headline">{isEditing ? '编辑助理规则' : '新增助理规则'}</AlertDialogTitle>
                    <AlertDialogDescription>创建一条带有优先级的规则，以在特定条件下自动启用具有特定能力的AI助理。</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor="rule-name">规则名称</Label><Input id="rule-name" value={rule.name} onChange={e => setRule(prev => ({ ...prev, name: e.target.value }))} placeholder="例如：夜间自动回复" /></div>
                        <div className="space-y-1"><Label htmlFor="rule-priority">优先级 (1-100, 数字越小越高)</Label><Input id="rule-priority" type="number" value={rule.priority} onChange={e => setRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 10 }))} /></div>
                    </div>
                     <Accordion type="multiple" className="w-full" defaultValue={['conditions', 'action']}>
                        <AccordionItem value="conditions"><AccordionTrigger><div className="flex items-center gap-2 font-semibold"><Settings className="w-4 h-4"/> 触发条件</div></AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-4">
                                <Accordion type="multiple" className="w-full">
                                    <AccordionItem value="time"><AccordionTrigger><div className="flex items-center gap-2"><Clock className="w-4 h-4"/> 时间维度</div></AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                            <div className="p-4 border rounded-md space-y-4">
                                                <div className="grid grid-cols-2 gap-4 items-center">
                                                     <div>
                                                        <Label>重复频率</Label>
                                                        <Select value={rule.conditions.repetition || 'none'} onValueChange={(v) => handleConditionChange('repetition', v as any)}>
                                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                                            <SelectContent><SelectItem value="none">不重复</SelectItem><SelectItem value="daily">每天</SelectItem><SelectItem value="weekly">每周</SelectItem></SelectContent>
                                                        </Select>
                                                    </div>
                                                    {rule.conditions.repetition === 'weekly' && (
                                                        <div><Label>选择星期</Label><div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">{DAYS_OF_WEEK.map(day => (<div key={day.id} className="flex items-center space-x-1"><Checkbox id={`day-${day.id}`} checked={rule.conditions.daysOfWeek?.includes(day.id)} onCheckedChange={() => handleDayToggle(day.id)} /><Label htmlFor={`day-${day.id}`} className="text-xs font-normal">{day.label}</Label></div>))}</div></div>
                                                    )}
                                                </div>
                                                 {(rule.conditions.repetition && rule.conditions.repetition !== 'none') && <div><Label>生效时间窗口</Label><div className="flex items-center gap-2"><TimePicker date={rule.conditions.startTime ? new Date(`1970-01-01T${rule.conditions.startTime}`) : undefined} setDate={(d) => handleConditionChange('startTime', d ? format(d, 'HH:mm') : undefined)} /><span>-</span><TimePicker date={rule.conditions.endTime ? new Date(`1970-01-01T${rule.conditions.endTime}`) : undefined} setDate={(d) => handleConditionChange('endTime', d ? format(d, 'HH:mm') : undefined)} /></div></div>}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                     <div className="flex items-center justify-center py-2"><RadioGroup value={rule.conditions.ruleLogic} onValueChange={(v) => handleConditionChange('ruleLogic', v as any)} className="flex items-center space-x-4 border p-2 rounded-lg bg-muted/30"><RadioGroupItem value="and" id="logic-and" /><Label htmlFor="logic-and">同时满足 (与)</Label><RadioGroupItem value="or" id="logic-or" /><Label htmlFor="logic-or">满足任意一个 (或)</Label></RadioGroup></div>
                                    <AccordionItem value="user"><AccordionTrigger><div className="flex items-center gap-2"><Users className="w-4 h-4"/> 用户维度</div></AccordionTrigger>
                                        <AccordionContent className="pt-4 space-y-4"><p className="text-sm text-muted-foreground">限定目标用户。若不配置，则对所有用户生效。</p><div className="space-y-3">{ALL_ROLES.map(role => (<div key={role} className="p-3 border rounded-md"><div className="flex items-center space-x-2"><Checkbox id={`role-${role}`} checked={!!rule.conditions.targetUserRoles?.[role]} onCheckedChange={() => handleRoleToggle(role)} /><Label htmlFor={`role-${role}`} className="text-sm font-medium">{ROLE_NAMES[role]}</Label></div>{rule.conditions.targetUserRoles?.[role] && (<div className="pt-3 mt-3 border-t"><Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Star className="w-3 h-3"/> 限定星级 (不选则对该角色所有星级生效)</Label><div className="flex flex-wrap gap-x-3 gap-y-1">{Array.from({length: 10}, (_, i) => i + 1).map(rating => (<div key={rating} className="flex items-center space-x-1"><Checkbox id={`rating-${role}-${rating}`} checked={rule.conditions.targetUserRoles?.[role]?.includes(rating)} onCheckedChange={() => handleRatingToggle(role, rating)}/><Label htmlFor={`rating-${role}-${rating}`} className="text-xs font-normal">{rating}星</Label></div>))}</div></div>)}</div>))}</div></AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="action"><AccordionTrigger><div className="flex items-center gap-2 font-semibold"><BrainCircuit className="w-4 h-4"/> 执行动作</div></AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-2">
                                {rule.action.type === 'use_prompt' && (
                                    <div className="space-y-2">
                                        <Label>选择AI助理能力 (提示词)</Label>
                                        <Select
                                        value={rule.action.promptKey}
                                        onValueChange={(v) =>
                                            setRule((p) => ({
                                            ...p,
                                            action: { ...p.action, promptKey: v },
                                            }))
                                        }
                                        >
                                        <SelectTrigger>
                                            <SelectValue placeholder="请选择一个提示词..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {prompts.map((p) => (
                                            <SelectItem key={p.promptKey} value={p.promptKey}>
                                                {p.name}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                 <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSave} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 保存规则</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// =================================================================
// 3D AI CREATION TAB (New structure with sub-tabs)
// =================================================================
function CreationsTab({ onSubmissionSuccess }: { onSubmissionSuccess: () => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">AI 图像创作</CardTitle>
                <CardDescription>选择您偏好的创作工具，输入创意描述，AI将为您生成预览图，完成后可直接提交入库审核。</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="nano-banana" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="built-in">内置模型</TabsTrigger>
                        <TabsTrigger value="tripo3d">Tripo3D</TabsTrigger>
                        <TabsTrigger value="nano-banana">Gemini Image</TabsTrigger>
                    </TabsList>
                    <TabsContent value="built-in" className="pt-6">
                        <BuiltInGenerator onSubmissionSuccess={onSubmissionSuccess} />
                    </TabsContent>
                    <TabsContent value="tripo3d" className="pt-6">
                        <Tripo3DGenerator onSubmissionSuccess={onSubmissionSuccess} />
                    </TabsContent>
                    <TabsContent value="nano-banana" className="pt-6">
                        <NanoBananaGenerator onSubmissionSuccess={onSubmissionSuccess} />
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
  const [activeTab, setActiveTab] = useState("schedule-assistant");
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
        <TabsList className="grid w-full grid-cols-4 max-w-3xl mx-auto">
          <TabsTrigger value="tasks">任务与需求</TabsTrigger>
          <TabsTrigger value="schedule-assistant">排班与助理</TabsTrigger>
          <TabsTrigger value="3d-creation">AI 创作</TabsTrigger>
          <TabsTrigger value="submissions">我的提交</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6"><TasksTab /></TabsContent>
        <TabsContent value="schedule-assistant" className="mt-6"><ScheduleAndAssistantTab /></TabsContent>
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

    