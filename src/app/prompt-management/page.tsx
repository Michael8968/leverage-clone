'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { Edit, Trash2, Copy, Loader2, PlusCircle, Frown, Bot, Workflow, TestTube2, KeyRound, Settings2, Wrench } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback, useTransition } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';

import { getPlatformAssets, testLlmConnection, type LlmProvider } from '@/ai/flows/admin-management-flows';
import type { LlmConnection } from '@/lib/types';


// =================================================================
// TYPE DEFINITIONS (Matching Firestore Structures)
// =================================================================

interface Prompt {
    id: string;
    name: string;
    description: string;
    scope: string;
    status: '生效中' | '草稿' | '已停用';
    content: string;
    ownerId: string;
    ownerType: 'platform' | 'creator';
    ownerName?: string;
    // New fields for LLM binding
    modelId?: string;
    priority?: number;
}


// =================================================================
// ZOD SCHEMAS
// =================================================================

const promptSchema = z.object({
  name: z.string().min(2, "名称至少需要2个字符"),
  description: z.string().min(5, "描述至少需要5个字符"),
  scope: z.string().min(2, "范围不能为空"),
  status: z.enum(['生效中', '草稿', '已停用']),
  content: z.string().min(20, "提示词内容至少需要20个字符"),
  modelId: z.string().optional(),
  priority: z.preprocess(
    (val) => val ? parseInt(String(val), 10) : undefined,
    z.number().int().min(1).max(100).optional()
  ),
});

const llmConnectionSchema = z.object({
  provider: z.string({ required_error: "请选择一个厂商。" }),
  modelName: z.string({ required_error: "请选择一个模型。" }),
  apiKey: z.string().min(1, "API Key 不能为空。"),
  priority: z.preprocess(
      (val) => val ? parseInt(String(val), 10) : 0,
      z.number().int().min(1, "优先级必须大于0").max(100, "优先级不能大于100")
  ),
  status: z.enum(['活跃', '已禁用']),
  scope: z.enum(['通用', '专属']),
  category: z.enum(['文本', '图像']),
});


// =================================================================
// HELPER & UTILITY COMPONENTS
// =================================================================

const getStatusBadge = (status: Prompt['status'] | LlmConnection['status']) => {
    switch (status) {
        case '生效中':
        case '活跃':
            return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{status}</Badge>;
        case '草稿':
            return <Badge variant="secondary">{status}</Badge>;
        case '已停用':
        case '已禁用':
            return <Badge variant="outline">{status}</Badge>;
        default:
            return <Badge>{status}</Badge>;
    }
}

function RestrictedAccess() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Frown className="w-16 h-16 mb-4 text-destructive"/>
            <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
            <p className="text-muted-foreground">此页面仅对“管理员”和“创意者”角色的用户开放。</p>
        </div>
    );
}

// =================================================================
// PROMPT EDIT DIALOG
// =================================================================

function PromptEditDialog({ prompt, open, onOpenChange, onSave, availableLlms }: {
    prompt: Partial<Prompt> | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    availableLlms: LlmConnection[];
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuthStore();
    const isEditing = !!prompt?.id;

    const form = useForm<z.infer<typeof promptSchema>>({
        resolver: zodResolver(promptSchema),
        defaultValues: { 
            name: '', description: '', scope: '通用', status: '草稿', content: '',
            modelId: undefined, priority: 10,
        },
    });

    useEffect(() => {
        if (open && prompt) {
            form.reset(prompt);
        } else if (!open) {
            form.reset({ 
                name: '', description: '', scope: '通用', status: '草稿', content: '',
                modelId: undefined, priority: 10,
            });
        }
    }, [open, prompt, form]);

    const handleSubmit = async (values: z.infer<typeof promptSchema>) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const dataToSave: Partial<Prompt> = {
                ...values,
                modelId: values.modelId || '',
                priority: values.priority || 10,
            }

            if (isEditing) {
                const docRef = doc(db, 'prompts', prompt!.id!);
                await updateDoc(docRef, dataToSave);
                toast({ title: "成功", description: "提示词已更新。" });
            } else {
                const newPromptData = {
                    ...dataToSave,
                    ownerId: user.uid,
                    ownerType: user.role === 'admin' ? 'platform' : 'creator',
                    ownerName: user.name,
                    createdAt: serverTimestamp(),
                };
                await addDoc(collection(db, 'prompts'), newPromptData);
                toast({ title: "成功", description: "新提示词已创建。" });
            }
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving prompt:", error);
            toast({ title: "保存失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditing ? `编辑提示词: ${prompt?.name}` : '创建新提示词'}</DialogTitle>
                    <DialogDescription>
                        设计一个专业的结构化提示词，并为其绑定一个执行模型和调用优先级。
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>提示词名称</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="scope" render={({ field }) => (<FormItem><FormLabel>生效范围</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>功能简述</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>提示词内容 (Prompt)</FormLabel><FormControl><Textarea className="font-mono text-xs" rows={10} {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        
                        <div className="grid grid-cols-3 gap-4 items-end">
                            <FormField control={form.control} name="modelId" render={({ field }) => (
                                <FormItem className="col-span-2">
                                    <FormLabel>绑定模型</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="默认（或选择一个模型）" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="">默认</SelectItem>
                                            {availableLlms.map(llm => (
                                                <SelectItem key={llm.id} value={llm.id}>
                                                    {llm.provider} - {llm.modelName} (P{llm.priority})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="priority" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>调用优先级</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="10" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        
                        <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>状态</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger></FormControl><SelectContent><SelectItem value="生效中">生效中</SelectItem><SelectItem value="草稿">草稿</SelectItem><SelectItem value="已停用">已停用</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>

                        <DialogFooter className="pt-4 sticky bottom-0 bg-popover -mx-6 px-6 pb-6 -mb-6">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                                {isEditing ? '保存更改' : '创建提示词'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// =================================================================
// LLM CONFIG DIALOG
// =================================================================

function LLMConfigDialog({ llm, open, onOpenChange, onSave }: {
    llm: Partial<LlmConnection> | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, startTesting] = useTransition();
    const { toast } = useToast();
    const isEditing = !!llm?.id;
    const [providers, setProviders] = useState<LlmProvider[]>([]);

    useEffect(() => {
        if (open) {
            getPlatformAssets().then(assets => {
                setProviders(assets.providers);
            });
        }
    }, [open]);

    const form = useForm<z.infer<typeof llmConnectionSchema>>({
        resolver: zodResolver(llmConnectionSchema),
        defaultValues: {
            provider: '', modelName: '', apiKey: '', priority: 10,
            status: '活跃', scope: '通用', category: '文本',
        },
    });

    useEffect(() => {
        if (open && llm) {
            form.reset(llm);
        } else if (!open) {
            form.reset({
                provider: '', modelName: '', apiKey: '', priority: 10,
                status: '活跃', scope: '通用', category: '文本',
            });
        }
    }, [open, llm, form]);
    
    const selectedProviderName = form.watch("provider");

    const availableModels = useMemo(() => {
        const selectedProvider = providers.find(p => p.providerName === selectedProviderName);
        return selectedProvider ? selectedProvider.models : [];
    }, [selectedProviderName, providers]);

    useEffect(() => {
        // Reset modelName when provider changes
        if (form.getValues("modelName") && !availableModels.includes(form.getValues("modelName"))) {
            form.setValue("modelName", "");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProviderName, availableModels, form]);

    const handleSubmit = async (values: z.infer<typeof llmConnectionSchema>) => {
        setIsSubmitting(true);
        try {
            if (isEditing && llm?.id) {
                const docRef = doc(db, 'llm_connections', llm.id);
                await updateDoc(docRef, values);
                toast({ title: "成功", description: "模型连接已更新。" });
            } else {
                await addDoc(collection(db, 'llm_connections'), { ...values, createdAt: serverTimestamp() });
                toast({ title: "成功", description: "新模型连接已添加。" });
            }
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving LLM connection:", error);
            toast({ title: "保存失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTestAvailability = async () => {
        await form.trigger(); // Trigger validation
        const formState = form.formState;
        if (!formState.isValid) {
            toast({
                title: "信息不完整",
                description: "请先完成所有必填项再进行测试。",
                variant: "destructive",
            });
            return;
        }

        const values = form.getValues();
        startTesting(async () => {
            try {
                // We need to save the connection to get an ID for testing
                let modelId = isEditing ? llm!.id! : '';
                if (!isEditing) {
                   const tempDocRef = await addDoc(collection(db, 'llm_connections'), { ...values, status: '已禁用', createdAt: serverTimestamp() });
                   modelId = tempDocRef.id;
                } else {
                   await updateDoc(doc(db, 'llm_connections', modelId), values);
                }

                const result = await testLlmConnection({ modelId });
                toast({
                    title: result.success ? "测试成功" : "测试失败",
                    description: result.message,
                    variant: result.success ? "default" : "destructive",
                });
                
                if (!isEditing && !result.success && modelId) {
                    await deleteDoc(doc(db, 'llm_connections', modelId));
                }
            } catch (error: any) {
                toast({
                    title: "测试出错",
                    description: error.message || "执行测试时发生未知错误。",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditing ? `编辑模型连接: ${llm?.modelName}` : '新增LLM连接'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="provider"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>厂商</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="选择厂商" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {providers.map(p => <SelectItem key={p.id} value={p.providerName}>{p.providerName}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="modelName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>模型名称</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProviderName}>
                                            <FormControl><SelectTrigger><SelectValue placeholder={availableModels.length > 0 ? "选择模型" : "请先选厂商"} /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {availableModels.map(model => <SelectItem key={model} value={model}>{model}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField control={form.control} name="apiKey" render={({ field }) => (<FormItem><FormLabel>API Key</FormLabel><FormControl><Input type="password" placeholder="输入您的 API Key" {...field} /></FormControl><FormMessage /></FormItem>)}/>

                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>优先级 (1-100)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>状态</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="活跃">活跃</SelectItem><SelectItem value="已禁用">已禁用</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="scope" render={({ field }) => (<FormItem><FormLabel>范围</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="通用">通用</SelectItem><SelectItem value="专属">专属</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>类别</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="文本">文本</SelectItem><SelectItem value="图像">图像</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                        </div>

                        <DialogFooter className="pt-4 !mt-8">
                            <Button type="button" variant="outline" onClick={handleTestAvailability} disabled={isTesting}>
                                {isTesting ? <Loader2 className="animate-spin mr-2"/> : <TestTube2 className="mr-2"/>}
                                可用性测试
                            </Button>
                            <div className="flex-grow"></div>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                                保存
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================

export default function PromptManagementPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [llms, setLlms] = useState<LlmConnection[]>([]);
    const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
    const [isLoadingLLMs, setIsLoadingLLMs] = useState(true);
    
    const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
    const [isLLMDialogOpen, setIsLLMDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [selectedLLM, setSelectedLLM] = useState<LlmConnection | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{id: string; name: string; type: 'prompts' | 'llm_connections'} | null>(null);

    const { toast } = useToast();
    const { user, role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();

    // --- DATA FETCHING ---
    const fetchPrompts = useCallback(async () => {
        if (!user) return;
        setIsLoadingPrompts(true);
        try {
            const promptsCollection = collection(db, 'prompts');
            let q;
            if (role === 'admin') {
                q = query(promptsCollection, orderBy('name'));
            } else if (role === 'creator') {
                q = query(promptsCollection, where('ownerId', '==', user.uid), orderBy('name'));
            } else {
                setPrompts([]);
                return;
            }
            const promptsSnapshot = await getDocs(q);
            setPrompts(promptsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Prompt)));
        } catch (error) {
            toast({ title: '加载失败', description: '无法加载提示词列表。', variant: 'destructive' });
        } finally {
            setIsLoadingPrompts(false);
        }
    }, [user, role, toast]);
    
    const fetchLLMs = useCallback(async () => {
        setIsLoadingLLMs(true);
        try {
            const llmsCollection = collection(db, 'llm_connections');
            const q = query(llmsCollection, orderBy('priority'));
            const llmsSnapshot = await getDocs(q);
            setLlms(llmsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LlmConnection)));
        } catch (error) {
            console.log(error);
            toast({ title: '加载失败', description: '无法加载LLM连接列表。', variant: 'destructive' });
        } finally {
            setIsLoadingLLMs(false);
        }
    }, [toast]);


    useEffect(() => {
        if (!isAuthLoading) {
            fetchLLMs(); // All roles with access can see LLMs to select
            if (role === 'admin' || role === 'creator') {
                fetchPrompts();
            }
        }
    }, [isAuthLoading, role, fetchPrompts, fetchLLMs]);
    
    // --- HANDLERS ---
    const handleEditPrompt = (prompt: Prompt) => { setSelectedPrompt(prompt); setIsPromptDialogOpen(true); };
    const handleAddPrompt = () => { setSelectedPrompt(null); setIsPromptDialogOpen(true); };
    const handleDeletePrompt = (prompt: Prompt) => { setItemToDelete({id: prompt.id, name: prompt.name, type: 'prompts'}); setIsAlertOpen(true); };

    const handleEditLLM = (llm: LlmConnection) => { setSelectedLLM(llm); setIsLLMDialogOpen(true); };
    const handleAddLLM = () => { setSelectedLLM(null); setIsLLMDialogOpen(true); };
    const handleDeleteLLM = (llm: LlmConnection) => { setItemToDelete({id: llm.id, name: llm.modelName, type: 'llm_connections'}); setIsAlertOpen(true); };
    
    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(doc(db, itemToDelete.type, itemToDelete.id));
            toast({ title: "成功", description: `“${itemToDelete.name}”已删除。` });
            if (itemToDelete.type === 'prompts') fetchPrompts();
            else fetchLLMs();
        } catch (error) {
             toast({ title: "删除失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsAlertOpen(false);
            setItemToDelete(null);
        }
    };
    
    const handleCopy = (text: string, entity: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "已复制", description: `${entity} ID已复制到剪贴板。` });
    }

    // --- AUTH & RENDER ---
    useEffect(() => { if (!isAuthLoading && !user) { router.push('/login'); } }, [user, isAuthLoading, router]);
    if(isAuthLoading) { return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>; }
    if (!user || (role !== 'admin' && role !== 'creator')) { return <AppLayout><RestrictedAccess /></AppLayout>; }


    return (
        <AppLayout>
            <div className="p-4 md:p-8">
                <header className="mb-8">
                    <h1 className="text-2xl font-headline font-bold flex items-center gap-2"><Wrench />提示词工程与模型配置</h1>
                    <p className="text-muted-foreground">在此集中配置、管理不同业务场景下使用的专业提示词 (Prompt) 与大语言模型 (LLM)。</p>
                </header>
                
                <div className="space-y-8">
                    {role === 'admin' && (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="font-headline flex items-center gap-2"><Settings2 /> LLM 模型连接</CardTitle>
                                    <CardDescription>管理平台可用的大语言模型，设置优先级和可用性。</CardDescription>
                                </div>
                                <Button onClick={handleAddLLM}><PlusCircle className="mr-2"/> 新增连接</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>优先级</TableHead>
                                        <TableHead>模型名称</TableHead>
                                        <TableHead>厂商</TableHead>
                                        <TableHead>API Key</TableHead>
                                        <TableHead>状态</TableHead>
                                        <TableHead className="text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingLLMs ? Array.from({ length: 2 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></TableCell>
                                        </TableRow>
                                    )) : llms.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-24 text-center">暂无LLM连接配置。</TableCell></TableRow>
                                    ) : (
                                        llms.map((llm) => (
                                            <TableRow key={llm.id}>
                                                <TableCell className="font-bold">{llm.priority}</TableCell>
                                                <TableCell className="font-medium">{llm.modelName}</TableCell>
                                                <TableCell>{llm.provider}</TableCell>
                                                <TableCell className="text-xs">
                                                    {llm.apiKey ? <span className="flex items-center gap-1"><KeyRound className="w-3 h-3 text-green-500"/> 已配置</span> : <span className="text-muted-foreground/50">未配置</span>}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(llm.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditLLM(llm)}><Edit className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLLM(llm)}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="font-headline flex items-center gap-2"><Workflow />提示词库</CardTitle>
                                    <CardDescription>管理系统中所有生效的AI提示词。</CardDescription>
                                </div>
                                <Button onClick={handleAddPrompt}><PlusCircle className="mr-2"/> 新增提示词</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>提示词名称</TableHead>
                                        <TableHead>创建者</TableHead>
                                        <TableHead>功能简述</TableHead>
                                        <TableHead>生效范围</TableHead>
                                        <TableHead>状态</TableHead>
                                        <TableHead className="text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingPrompts ? Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></TableCell>
                                        </TableRow>
                                    )) : prompts.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-24 text-center">暂无提示词。请点击右上角“新增提示词”。</TableCell></TableRow>
                                    ) : (
                                        prompts.map((prompt) => (
                                            <TableRow key={prompt.id}>
                                                <TableCell className="font-medium">{prompt.name}</TableCell>
                                                <TableCell className="text-xs">
                                                    {prompt.ownerType === 'platform' ? <Badge variant="secondary">平台</Badge> : <span className="text-muted-foreground">{prompt.ownerName}</span>}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{prompt.description}</TableCell>
                                                <TableCell><Badge variant="outline">{prompt.scope}</Badge></TableCell>
                                                <TableCell>{getStatusBadge(prompt.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(prompt.id, '提示词')}><Copy className="h-3 w-3" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPrompt(prompt)}><Edit className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePrompt(prompt)}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <PromptEditDialog 
                open={isPromptDialogOpen} 
                onOpenChange={setIsPromptDialogOpen} 
                onSave={fetchPrompts} 
                prompt={selectedPrompt}
                availableLlms={llms.filter(llm => llm.status === '活跃')}
            />
            
            {role === 'admin' && (
                <LLMConfigDialog open={isLLMDialogOpen} onOpenChange={setIsLLMDialogOpen} onSave={fetchLLMs} llm={selectedLLM} />
            )}

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            您确定要删除 “{itemToDelete?.name}” 吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">确认删除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
