

'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';


import { Edit, Trash2, Loader2, PlusCircle, Frown, Bot, TestTube2, KeyRound, Settings2, Star, Globe, Link, ChevronsUpDown, Check, Circle } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback, useTransition } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
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
import { cn } from '@/lib/utils';


// =================================================================
// TYPE DEFINITIONS
// =================================================================
type TestResultStatus = 'untested' | 'success' | 'failed' | 'testing';
type TestResults = Record<string, TestResultStatus>;


// =================================================================
// ZOD SCHEMAS
// =================================================================

const llmConnectionSchema = z.object({
  provider: z.string().min(1, "请选择或输入一个厂商。"),
  modelName: z.string().min(1, "请选择或输入一个模型。"),
  apiKey: z.string().min(1, "API Key 不能为空。"),
  priority: z.preprocess(
      (val) => val ? parseInt(String(val), 10) : 0,
      z.number().int().min(1, "优先级必须大于0").max(100, "优先级不能大于100")
  ),
  status: z.enum(['活跃', '已禁用']),
  scope: z.string().min(1, "范围不能为空。"),
  category: z.string().min(1, "类别不能为空。"),
});


// =================================================================
// HELPER & UTILITY COMPONENTS
// =================================================================

function Combobox({ options, value, onChange, placeholder, onInputChange }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    onInputChange?: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);

    const handleSelect = (currentValue: string) => {
        const newValue = currentValue.toLowerCase() === value?.toLowerCase() ? "" : currentValue;
        onChange(newValue);
        if (onInputChange) onInputChange(newValue);
        setOpen(false);
    };

    const handleInputChange = (search: string) => {
        onChange(search);
        if (onInputChange) onInputChange(search);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value
                        ? options.find((option) => option.value.toLowerCase() === value.toLowerCase())?.label || value
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command shouldFilter={false}>
                    <CommandInput placeholder="搜索或输入..." value={value} onValueChange={handleInputChange} />
                     <CommandList>
                        <CommandEmpty>未找到匹配项。</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={handleSelect}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value?.toLowerCase() === option.value.toLowerCase() ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

const StatusBadge = ({ textStatus, testStatus }: { textStatus: LlmConnection['status']; testStatus: TestResultStatus }) => {
    const colorClasses: Record<TestResultStatus, string> = {
        untested: 'bg-gray-400 hover:bg-gray-500',
        testing: 'bg-blue-500 hover:bg-blue-600 animate-pulse',
        success: 'bg-green-500 hover:bg-green-600',
        failed: 'bg-destructive hover:bg-destructive/90',
    };
    
    return <Badge className={cn(colorClasses[testStatus], 'text-primary-foreground')}>{textStatus}</Badge>;
}

function RestrictedAccess() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Frown className="w-16 h-16 mb-4 text-destructive"/>
            <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
            <p className="text-muted-foreground">此页面仅对“管理员”角色的用户开放。</p>
        </div>
    );
}

// =================================================================
// LLM CONNECTION FORM (RIGHT PANEL)
// =================================================================

function LlmConnectionForm({ llm, onSave, onCancel, onTest, isTesting }: {
    llm: Partial<LlmConnection> | null;
    onSave: () => void;
    onCancel: () => void;
    onTest: (modelId: string) => void;
    isTesting: boolean;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const isEditing = !!llm?.id;
    const [providers, setProviders] = useState<LlmProvider[]>([]);

    useEffect(() => {
        getPlatformAssets(null).then(assets => {
            setProviders(assets.providers);
        });
    }, []);

    const form = useForm<z.infer<typeof llmConnectionSchema>>({
        resolver: zodResolver(llmConnectionSchema),
        defaultValues: {
            provider: '', modelName: '', apiKey: '', priority: 10,
            status: '活跃', scope: '通用', category: '文本',
        },
    });

    useEffect(() => {
        if (llm) {
            form.reset(llm);
        }
    }, [llm, form]);
    
    const selectedProviderName = form.watch("provider");

    const availableModels = useMemo(() => {
        const selectedProvider = providers.find(p => p.providerName.toLowerCase() === selectedProviderName.toLowerCase());
        return selectedProvider ? selectedProvider.models : [];
    }, [selectedProviderName, providers]);

    useEffect(() => {
        // Reset modelName when provider changes and the current model isn't in the new list
        if (form.getValues("modelName") && availableModels.length > 0 && !availableModels.map(m => m.toLowerCase()).includes(form.getValues("modelName").toLowerCase())) {
            form.setValue("modelName", "");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProviderName, form]);

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
        } catch (error) {
            console.error("Error saving LLM connection:", error);
            toast({ title: "保存失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const scopeOptions = [{value: '通用', label: '通用'}, {value: '专属', label: '专属'}];
    const categoryOptions = [{value: '文本', label: '文本'}, {value: '图像', label: '图像'}, {value: '推理', label: '推理'}, {value: '多模态', label: '多模态'}];


    return (
        <Card>
            <CardHeader>
                <CardTitle className='font-headline'>{isEditing ? '管理连接' : '添加新连接'}</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="provider" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>厂商</FormLabel>
                                    <Combobox
                                        value={field.value}
                                        onChange={field.onChange}
                                        options={providers.map(p => ({ value: p.providerName, label: p.providerName }))}
                                        placeholder="选择或输入厂商"
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}/>
                           <FormField control={form.control} name="modelName" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>模型名称</FormLabel>
                                    <Combobox
                                        value={field.value}
                                        onChange={field.onChange}
                                        options={availableModels.map(m => ({ value: m, label: m }))}
                                        placeholder="选择或输入模型"
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="apiKey" render={({ field }) => (<FormItem><FormLabel>API Key</FormLabel><FormControl><Input type="password" placeholder="输入您的 API Key" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>优先级 (1-100)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>状态</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="活跃">活跃</SelectItem><SelectItem value="已禁用">已禁用</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="scope" render={({ field }) => (
                                 <FormItem className="flex flex-col">
                                     <FormLabel>范围</FormLabel>
                                     <Combobox
                                         value={field.value}
                                         onChange={field.onChange}
                                         options={scopeOptions}
                                         placeholder="选择或输入范围"
                                     />
                                     <FormMessage />
                                 </FormItem>
                             )}/>
                             <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>类别</FormLabel>
                                     <Combobox
                                         value={field.value}
                                         onChange={field.onChange}
                                         options={categoryOptions}
                                         placeholder="选择或输入类别"
                                     />
                                    <FormMessage />
                                </FormItem>
                             )}/>
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <Button type="button" variant="outline" onClick={() => onTest(llm!.id!)} disabled={isTesting || !isEditing}>
                                {isTesting ? <Loader2 className="animate-spin mr-2"/> : <TestTube2 className="mr-2"/>}
                                可用性测试
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                                    保存
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================

export default function AdminDashboardPage() {
    const [llms, setLlms] = useState<LlmConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLlm, setSelectedLlm] = useState<LlmConnection | null>(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<LlmConnection | null>(null);
    const [testResults, setTestResults] = useState<TestResults>({});
    const [testingId, setTestingId] = useState<string | null>(null);

    const { toast } = useToast();
    const { user, role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();

    // --- DATA FETCHING ---
    const fetchLlms = useCallback(async () => {
        setIsLoading(true);
        try {
            const llmsCollection = collection(db, 'llm_connections');
            const q = query(llmsCollection, orderBy('priority'));
            const llmsSnapshot = await getDocs(q);
            const connections = llmsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LlmConnection));
            setLlms(connections);
            // Initialize test results state
            const initialResults: TestResults = {};
            connections.forEach(conn => {
                initialResults[conn.id] = 'untested';
            });
            setTestResults(initialResults);
        } catch (error) {
            toast({ title: '加载失败', description: '无法加载LLM连接列表。', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!isAuthLoading && role === 'admin') {
            fetchLlms();
        }
    }, [isAuthLoading, role, fetchLlms]);
    
    // --- HANDLERS ---
    const handleAddNew = () => {
        setSelectedLlm(null);
        setIsFormVisible(true);
    };

    const handleEdit = (llm: LlmConnection) => {
        setSelectedLlm(llm);
        setIsFormVisible(true);
    };

    const handleDelete = (llm: LlmConnection) => {
        setItemToDelete(llm);
    };

    const handleTestAvailability = async (modelId: string) => {
        setTestingId(modelId);
        setTestResults(prev => ({ ...prev, [modelId]: 'testing' }));
        try {
            const result = await testLlmConnection({ modelId });
            toast({
                title: result.success ? "测试成功" : "测试失败",
                description: result.message,
                variant: result.success ? "default" : "destructive",
            });
            setTestResults(prev => ({ ...prev, [modelId]: result.success ? 'success' : 'failed' }));
        } catch (error: any) {
            toast({ title: "测试出错", description: error.message || "执行测试时发生未知错误。", variant: "destructive" });
            setTestResults(prev => ({ ...prev, [modelId]: 'failed' }));
        } finally {
            setTestingId(null);
        }
    };


    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(doc(db, 'llm_connections', itemToDelete.id));
            toast({ title: "成功", description: `“${itemToDelete.modelName}”已删除。` });
            fetchLlms();
        } catch (error) {
             toast({ title: "删除失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setItemToDelete(null);
        }
    };
    
    const handleSave = () => {
        setIsFormVisible(false);
        setSelectedLlm(null);
        fetchLlms();
    };

    const handleCancel = () => {
        setIsFormVisible(false);
        setSelectedLlm(null);
    };
    
    // --- AUTH & RENDER ---
    useEffect(() => { if (!isAuthLoading && !user) { router.push('/login'); } }, [user, isAuthLoading, router]);
    if(isAuthLoading) { return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>; }
    if (!user || (role !== 'admin')) { return <AppLayout><RestrictedAccess /></AppLayout>; }

    return (
        <AppLayout>
            <div className="p-4 md:p-8 space-y-6">
                <header>
                    <h1 className="text-2xl font-headline font-bold flex items-center gap-2"><Bot /> LLM 对接</h1>
                </header>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2">
                        <Card>
                             <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="font-headline">已配置模型</CardTitle>
                                    <Button onClick={handleAddNew}><PlusCircle className="mr-2"/> 添加新连接</Button>
                                </div>
                             </CardHeader>
                            <CardContent>
                                {/* Header Row */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                                    <div className="col-span-4">模型</div>
                                    <div className="col-span-2">优先级</div>
                                    <div className="col-span-2">分类</div>
                                    <div className="col-span-2">状态</div>
                                    <div className="col-span-2 text-right">操作</div>
                                </div>
                                
                                {/* Body Rows */}
                                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center p-4 border-b"><Skeleton className="h-6 w-full" /></div>
                                )) : llms.length === 0 ? (
                                    <div className="text-center p-10 text-muted-foreground">暂无LLM连接配置。</div>
                                ) : (
                                    llms.map((llm) => (
                                        <div key={llm.id} className={cn("grid grid-cols-12 gap-4 items-center px-4 py-3 border-b hover:bg-muted/50", selectedLlm?.id === llm.id && "bg-muted")}>
                                            <div className="col-span-12 md:col-span-4">
                                                <p className="font-medium">{llm.modelName}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3"/> {llm.provider} / {llm.scope}</p>
                                            </div>
                                            <div className="col-span-4 md:col-span-2"><Badge variant="outline" className="gap-1 pl-1.5"><Star className="w-3 h-3"/> {llm.priority}</Badge></div>
                                            <div className="col-span-4 md:col-span-2"><Badge variant="secondary">{llm.category}</Badge></div>
                                            <div className="col-span-4 md:col-span-2">
                                                <StatusBadge textStatus={llm.status} testStatus={testResults[llm.id] || 'untested'} />
                                            </div>
                                            <div className="col-span-12 md:col-span-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(llm)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(llm)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        {isFormVisible ? (
                           <LlmConnectionForm 
                                llm={selectedLlm}
                                onSave={handleSave}
                                onCancel={handleCancel}
                                onTest={handleTestAvailability}
                                isTesting={!!testingId}
                           />
                        ) : (
                             <Card className="sticky top-20">
                                <CardHeader>
                                    <CardTitle className='font-headline'>管理</CardTitle>
                                </CardHeader>
                                <CardContent className="h-40 flex items-center justify-center text-muted-foreground">
                                    <p>选择一个连接或添加新连接。</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            您确定要删除模型连接 “{itemToDelete?.modelName}” 吗？此操作不可撤销。
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

