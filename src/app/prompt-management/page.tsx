

'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';


import { Edit, Trash2, Loader2, PlusCircle, Frown, Bot, Workflow, Settings2, Star, User, Key, Info, Download, Copy, Database, Library, Building2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore, type Role } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { LlmConnection, Prompt, QuerySources, SourceTemperatures } from '@/lib/types';
import { getPrompts } from '@/ai/flows/admin-management-flows';


// =================================================================
// ZOD SCHEMAS
// =================================================================

const promptSchema = z.object({
  name: z.string().min(2, "名称至少需要2个字符。"),
  description: z.string().min(5, "描述至少需要5个字符。"),
  content: z.string().min(10, "提示词内容至少需要10个字符。"),
  scope: z.enum(['通用', '专属']),
  status: z.enum(['生效中', '已停用']),
  modelId: z.string().optional(),
  priority: z.preprocess(
    (val) => val ? parseInt(String(val), 10) : undefined,
    z.number().int().min(1).optional()
  ),
  promptKey: z.string().optional(),
  querySources: z.object({
    suppliers: z.boolean().default(false),
    knowledgeBase: z.boolean().default(true),
    publicResources: z.boolean().default(false),
  }).default({ suppliers: false, knowledgeBase: true, publicResources: false }),
  sourceTemperatures: z.object({
      suppliers: z.number().min(0).max(1).default(0.5),
      knowledgeBase: z.number().min(0).max(1).default(0.2),
      publicResources: z.number().min(0).max(1).default(0.8),
  }).default({ suppliers: 0.5, knowledgeBase: 0.2, publicResources: 0.8 }),
});


// =================================================================
// MAIN PAGE COMPONENT
// =================================================================

export default function PromptManagementPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [llms, setLlms] = useState<LlmConnection[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Prompt | null>(null);

    const { toast } = useToast();
    const { user, role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();

    // --- DATA FETCHING ---
    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Fetch prompts based on role
            const promptsCollection = collection(db, 'prompts');
            let q;
            if (role === 'admin') {
                // For admin, fetch all prompts and sort later
                q = query(promptsCollection);
            } else { // creator
                // For creators, filter by ownerId and sort later
                q = query(promptsCollection, where("ownerId", "==", user.uid));
            }
            const promptsSnapshot = await getDocs(q);
            const promptsList = promptsSnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    ...data, 
                    id: doc.id,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
                } as Prompt
            });
            
            // Perform client-side sorting
            promptsList.sort((a, b) => a.name.localeCompare(b.name));
            setPrompts(promptsList);

            // Fetch active LLMs for the dropdown
            const llmsCollection = collection(db, 'llm_connections');
            const llmsQuery = query(llmsCollection, orderBy("priority"));
            const llmsSnapshot = await getDocs(llmsQuery);
            const allLlms = llmsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LlmConnection));
            setLlms(allLlms.filter(llm => llm.status === '活跃'));

        } catch (error) {
            console.error("Data loading failed:", error)
            toast({ title: '加载失败', description: '无法加载数据。', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast, user, role]);

    useEffect(() => {
        if (!isAuthLoading) {
            if (!user || !['admin', 'creator'].includes(role!)) {
                router.push('/dashboard');
            } else {
                fetchData();
            }
        }
    }, [isAuthLoading, role, user, router, fetchData]);
    
    // --- HANDLERS ---
    const handleAddNew = () => {
        setSelectedPrompt(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setIsDialogOpen(true);
    };

    const handleDelete = (prompt: Prompt) => {
        setItemToDelete(prompt);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(doc(db, 'prompts', itemToDelete.id));
            toast({ title: "成功", description: `提示词“${itemToDelete.name}”已删除。` });
            fetchData();
        } catch (error) {
             toast({ title: "删除失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setItemToDelete(null);
        }
    };
    
    const handleSave = () => {
        setIsDialogOpen(false);
        setSelectedPrompt(null);
        fetchData();
    };

    // --- AUTH & RENDER ---
    if(isAuthLoading || isLoading && !prompts.length) { return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>; }
    if (!user || !role || !['admin', 'creator'].includes(role)) { 
        return <AppLayout><RestrictedAccess /></AppLayout>; 
    }

    return (
        <AppLayout>
            <div className="p-4 md:p-8 space-y-6">
                <header>
                    <h1 className="text-2xl font-headline font-bold flex items-center gap-2"><Workflow /> 提示词库</h1>
                    <p className="text-muted-foreground">在这里，您可以创建、编辑和管理平台所有AI场景的提示词。</p>
                </header>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="font-headline">我的提示词</CardTitle>
                            <Button onClick={handleAddNew}><PlusCircle className="mr-2"/> 新增提示词</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>提示词名称</TableHead>
                                    <TableHead>提示词KEY</TableHead>
                                    {role === 'admin' && <TableHead>创建者</TableHead>}
                                    <TableHead>范围</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>绑定模型</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={role === 'admin' ? 7 : 6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                )) : prompts.length === 0 ? (
                                    <TableRow><TableCell colSpan={role === 'admin' ? 7 : 6} className="text-center h-24">暂无提示词，请点击右上角新增。</TableCell></TableRow>
                                ) : (
                                    prompts.map((prompt) => (
                                        <TableRow key={prompt.id}>
                                            <TableCell className="font-medium">{prompt.name}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{prompt.promptKey}</TableCell>
                                            {role === 'admin' && (
                                                <TableCell>
                                                    {prompt.ownerType === 'platform' 
                                                        ? <Badge variant="secondary"><Settings2 className="w-3 h-3 mr-1"/>平台</Badge> 
                                                        : <Badge variant="outline"><User className="w-3 h-3 mr-1"/>创意者</Badge>}
                                                </TableCell>
                                            )}
                                            <TableCell><Badge variant="outline">{prompt.scope}</Badge></TableCell>
                                            <TableCell>{prompt.status === '生效中' 
                                                ? <Badge className="bg-green-500 hover:bg-green-600">生效中</Badge> 
                                                : <Badge variant="destructive">已停用</Badge>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {llms.find(l => l.id === prompt.modelId)?.modelName || '系统默认'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(prompt)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(prompt)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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

            <PromptEditDialog
                key={selectedPrompt?.id || 'new'}
                prompt={selectedPrompt}
                llms={llms}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSave}
            />

            <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            您确定要删除提示词 “{itemToDelete?.name}” 吗？此操作不可撤销。
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

function RestrictedAccess() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Frown className="w-16 h-16 mb-4 text-destructive"/>
            <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
            <p className="text-muted-foreground">此页面仅对“管理员”和“创意者”角色的用户开放。</p>
        </div>
    );
}


function PromptEditDialog({ prompt, llms, open, onOpenChange, onSave }: {
    prompt: Partial<Prompt> | null;
    llms: LlmConnection[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user, role } = useAuthStore();
    const isEditing = !!prompt?.id;

    const canEditContent = role === 'admin' || (isEditing ? prompt.ownerId === user?.uid : true);

    const form = useForm<z.infer<typeof promptSchema>>({
        resolver: zodResolver(promptSchema),
        defaultValues: {
            name: '',
            description: '',
            content: '',
            scope: '通用',
            status: '生效中',
            modelId: '',
            priority: undefined,
            promptKey: '',
            querySources: {
                suppliers: false,
                knowledgeBase: true,
                publicResources: false,
            },
            sourceTemperatures: {
                suppliers: 0.5,
                knowledgeBase: 0.2,
                publicResources: 0.8,
            }
        },
    });
    
    // Watch for temperature changes to update UI
    const sourceTemperatures = form.watch("sourceTemperatures");


    useEffect(() => {
        if (open) {
            if (prompt) {
                form.reset({
                    ...prompt,
                    modelId: prompt.modelId || '',
                    priority: prompt.priority || undefined,
                    querySources: prompt.querySources || { suppliers: false, knowledgeBase: true, publicResources: false },
                    sourceTemperatures: prompt.sourceTemperatures || { suppliers: 0.5, knowledgeBase: 0.2, publicResources: 0.8 },
                });
            } else {
                form.reset({
                    name: '',
                    description: '',
                    content: '',
                    scope: '通用',
                    status: '生效中',
                    modelId: '',
                    priority: undefined,
                    promptKey: '',
                    querySources: { suppliers: false, knowledgeBase: true, publicResources: false },
                    sourceTemperatures: { suppliers: 0.5, knowledgeBase: 0.2, publicResources: 0.8 },
                });
            }
        }
    }, [prompt, open, form]);
    
    const generateKeyFromName = (name: string) => {
        return name
            .trim()
            .toLowerCase()
            .replace(/[\s_]+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
    }
    
    const handleImportMetaPrompt = () => {
        const metaPrompt = `You are a world-class AI assistant. Your goal is to be helpful and accurate.
You will receive a context and a question. Your task is to use the provided context to answer the question.

Context:
{{{json context}}}

Question:
{{{question}}}

Based on the context, provide a clear and concise answer. If the context does not contain the answer, state that you cannot find the information.
`;
        form.setValue('content', metaPrompt, { shouldValidate: true, shouldDirty: true });
        toast({ title: "导入成功", description: "元提示词已填充到内容框中。" });
    };

    const handleCopyBaseUrl = () => {
        if (prompt?.promptKey) {
            const baseUrl = `https://api.leverage.pro/v1/execute/${prompt.promptKey}`;
            navigator.clipboard.writeText(baseUrl);
            toast({ title: "已复制", description: "调用地址已复制到剪贴板。" });
        }
    };

    const handleSubmit = async (values: z.infer<typeof promptSchema>) => {
        if (!user || !role) return;

        setIsSubmitting(true);
        try {
            const dataToSave: any = { 
                ...values, 
                modelId: values.modelId === '__system_default__' ? null : values.modelId,
                priority: values.priority || null,
            };
            
            if (!dataToSave.modelId) delete dataToSave.modelId;
            if (!dataToSave.priority) delete dataToSave.priority;

            if (isEditing) {
                const docRef = doc(db, 'prompts', prompt!.id!);
                await updateDoc(docRef, dataToSave);
                toast({ title: "成功", description: "提示词已更新。" });
            } else {
                const newKey = generateKeyFromName(values.name);
                const finalKey = `${newKey}-${Date.now().toString().slice(-4)}`;
                
                await addDoc(collection(db, 'prompts'), { 
                    ...dataToSave, 
                    promptKey: finalKey,
                    ownerId: user.uid,
                    ownerType: role === 'admin' ? 'platform' : 'creator',
                    createdAt: serverTimestamp() 
                });
                toast({ title: "成功", description: "新提示词已添加。" });
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

    const modelIdValue = form.watch('modelId');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditing ? '编辑提示词' : '新增提示词'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>名称</FormLabel><FormControl><Input placeholder="例如：用户画像生成" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             {isEditing && (
                                <FormField control={form.control} name="promptKey" render={({ field }) => (<FormItem>
                                <FormLabel><div className="flex items-center gap-1">提示词KEY <Info className="w-3 h-3 text-muted-foreground"/></div></FormLabel>
                                <FormControl><Input disabled {...field} /></FormControl>
                                </FormItem>)} />
                             )}
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>功能描述</FormLabel><FormControl><Input placeholder="描述此提示词的用途" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="scope" render={({ field }) => (<FormItem><FormLabel>范围</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="通用">通用</SelectItem><SelectItem value="专属">专属</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                           <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>状态</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="生效中">生效中</SelectItem><SelectItem value="已停用">已停用</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                        </div>
                        
                        <FormField control={form.control} name="content" render={({ field }) => (<FormItem>
                            <div className="flex justify-between items-center">
                                <FormLabel>提示词内容</FormLabel>
                                <Button variant="link" type="button" onClick={handleImportMetaPrompt} className="text-xs h-auto p-0 gap-1">
                                    <Download className="w-3 h-3"/>
                                    导入元提示词
                                </Button>
                            </div>
                            <FormControl>
                               <Textarea
                                    placeholder="在此输入您的结构化提示词..."
                                    readOnly={!canEditContent}
                                    className={!canEditContent ? 'bg-muted cursor-not-allowed' : ''}
                                    {...field}
                                    rows={8}
                                />
                            </FormControl>
                             {!canEditContent && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> 您没有权限编辑此提示词的内容。</p>
                            )}
                            <FormMessage />
                        </FormItem>)}/>
                        
                         {isEditing && prompt?.promptKey && (
                            <FormItem>
                                <FormLabel>调用地址 (Base URL)</FormLabel>
                                <div className="flex gap-2">
                                <FormControl>
                                    <Input readOnly value={`https://api.leverage.pro/v1/execute/${prompt.promptKey}`} className="font-mono text-xs bg-muted" />
                                </FormControl>
                                <Button type="button" variant="outline" size="icon" onClick={handleCopyBaseUrl}>
                                    <Copy className="w-4 h-4"/>
                                </Button>
                                </div>
                            </FormItem>
                        )}
                        
                        <Card className="bg-muted/50">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base flex items-center gap-2"><Key/> 查询范围与配置</CardTitle>
                             <CardDescription className="text-xs">定义此提示词在执行时应从哪些数据源检索信息，并调整其创造性程度（温度）。</CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 pt-2 space-y-4">
                            {(['knowledgeBase', 'suppliers', 'publicResources'] as const).map(source => (
                                <div key={source} className="grid grid-cols-12 items-center gap-4">
                                    <FormField
                                        control={form.control}
                                        name={`querySources.${source}`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-4 flex items-center gap-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <FormLabel className="flex items-center gap-2 font-normal cursor-pointer">
                                                    {source === 'knowledgeBase' && <Database className="w-4 h-4 text-muted-foreground"/>}
                                                    {source === 'suppliers' && <Building2 className="w-4 h-4 text-muted-foreground"/>}
                                                    {source === 'publicResources' && <Library className="w-4 h-4 text-muted-foreground"/>}
                                                    {source === 'knowledgeBase' ? '知识库' : source === 'suppliers' ? '供应商库' : '公共资源库'}
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="col-span-8 flex items-center gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`sourceTemperatures.${source}`}
                                            render={({ field }) => (
                                                <FormControl>
                                                    <Slider
                                                        min={0} max={1} step={0.1}
                                                        defaultValue={[field.value]}
                                                        onValueChange={(value) => field.onChange(value[0])}
                                                    />
                                                </FormControl>
                                            )}
                                        />
                                        <span className="text-sm font-mono w-10 text-right">{sourceTemperatures[source]?.toFixed(1)}</span>
                                    </div>
                                </div>
                            ))}
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-muted/50">
                          <CardHeader className="p-4">
                            <CardTitle className="text-base flex items-center gap-2"><Settings2/> 执行配置</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="modelId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>绑定模型</FormLabel>
                                     <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value || '__system_default__'}
                                     >
                                        <FormControl><SelectTrigger><SelectValue placeholder="使用系统默认模型" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="__system_default__">-- 使用系统默认模型 --</SelectItem>
                                            {llms.map(llm => <SelectItem key={llm.id} value={llm.id}>{llm.modelName} ({llm.provider})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>调用优先级</FormLabel><FormControl><Input type="number" placeholder="1-100, 越小越高" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                          </CardContent>
                        </Card>

                        <DialogFooter className="pt-4 sticky bottom-0 bg-popover -mx-6 px-6 pb-6 -mb-6">
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
