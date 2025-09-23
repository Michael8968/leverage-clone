
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

import { Edit, Trash2, Copy, Loader2, PlusCircle, Frown } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';


// 定义 Prompt 数据的 TypeScript 接口
interface Prompt {
    id: string;
    name: string;
    description: string;
    scope: string;
    status: '生效中' | '草稿' | '已停用';
    content: string;
    ownerId: string;
    ownerType: 'platform' | 'creator';
    ownerName?: string; // For display
}

const promptSchema = z.object({
  name: z.string().min(2, "名称至少需要2个字符"),
  description: z.string().min(5, "描述至少需要5个字符"),
  scope: z.string().min(2, "范围不能为空"),
  status: z.enum(['生效中', '草稿', '已停用']),
  content: z.string().min(20, "提示词内容至少需要20个字符"),
});


function PromptEditDialog({ prompt, open, onOpenChange, onSave }: {
    prompt: Partial<Prompt> | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuthStore();
    const isEditing = !!prompt?.id;

    const form = useForm<z.infer<typeof promptSchema>>({
        resolver: zodResolver(promptSchema),
        defaultValues: { name: '', description: '', scope: '通用', status: '草稿', content: '' },
    });

    useEffect(() => {
        if (open && prompt) {
            form.reset(prompt);
        } else if (!open) {
            form.reset({ name: '', description: '', scope: '通用', status: '草稿', content: '' });
        }
    }, [open, prompt, form]);

    const handleSubmit = async (values: z.infer<typeof promptSchema>) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            if (isEditing) {
                const docRef = doc(db, 'prompts', prompt!.id!);
                await updateDoc(docRef, values);
                toast({ title: "成功", description: "提示词已更新。" });
            } else {
                const newPromptData = {
                    ...values,
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
                        设计一个专业的结构化提示词。请谨慎操作，这将直接影响相关AI功能的行为。
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>提示词名称</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="scope" render={({ field }) => (<FormItem><FormLabel>生效范围</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>功能简述</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>提示词内容 (Prompt)</FormLabel><FormControl><Textarea className="font-mono text-xs" rows={12} {...field} /></FormControl><FormMessage /></FormItem>)}/>
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

const getStatusBadge = (status: Prompt['status']) => {
    switch (status) {
        case '生效中':
            return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{status}</Badge>;
        case '草稿':
            return <Badge variant="secondary">{status}</Badge>;
        case '已停用':
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


export default function PromptManagementPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const { toast } = useToast();
    const { user, role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();

    const fetchPrompts = useMemo(() => async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const promptsCollection = collection(db, 'prompts');
            let q;
            if (role === 'admin') {
                // Admin sees all prompts
                q = query(promptsCollection, orderBy('name'));
            } else if (role === 'creator') {
                // Creator sees only their own prompts
                q = query(promptsCollection, where('ownerId', '==', user.uid), orderBy('name'));
            } else {
                // Other roles see nothing
                setPrompts([]);
                setIsLoading(false);
                return;
            }

            const promptsSnapshot = await getDocs(q);
            const promptsList = promptsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Prompt));
            setPrompts(promptsList);

        } catch (error) {
            console.error("Failed to fetch prompts:", error);
            toast({
                title: '加载失败',
                description: '无法加载提示词列表。',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, role, toast]);

    useEffect(() => {
        if (!isAuthLoading) {
            if (role === 'admin' || role === 'creator') {
                fetchPrompts();
            }
        }
    }, [isAuthLoading, role, fetchPrompts]);
    
    const handleEdit = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedPrompt(null);
        setIsDialogOpen(true);
    };

    const handleDelete = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setIsAlertOpen(true);
    };

     const confirmDelete = async () => {
        if (!selectedPrompt) return;
        try {
            await deleteDoc(doc(db, 'prompts', selectedPrompt.id));
            toast({ title: "成功", description: "提示词已删除。" });
            fetchPrompts();
        } catch (error) {
             toast({ title: "删除失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsAlertOpen(false);
            setSelectedPrompt(null);
        }
    };
    
    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        toast({ title: "已复制", description: "提示词ID已复制到剪贴板。" });
    }

    // Auth check
    useEffect(() => { if (!isAuthLoading && !user) { router.push('/login'); } }, [user, isAuthLoading, router]);
    if(isAuthLoading) { return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>; }
    if (!user || (role !== 'admin' && role !== 'creator')) { return <AppLayout><RestrictedAccess /></AppLayout>; }


    return (
        <AppLayout>
            <div className="p-4 md:p-8">
                <header className="mb-8">
                    <h1 className="text-2xl font-headline font-bold">提示词工程配置</h1>
                    <p className="text-muted-foreground">在此集中配置、管理不同业务场景下使用的专业提示词（Prompt）。</p>
                </header>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="font-headline">提示词库</CardTitle>
                                <CardDescription>管理系统中所有生效的AI提示词。</CardDescription>
                            </div>
                            <Button onClick={handleAdd}><PlusCircle className="mr-2"/> 新增提示词</Button>
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
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : prompts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            暂无提示词。请点击右上角“新增提示词”来创建您的第一个提示词。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    prompts.map((prompt) => (
                                        <TableRow key={prompt.id}>
                                            <TableCell className="font-medium">{prompt.name}</TableCell>
                                            <TableCell className="text-xs">
                                                {prompt.ownerType === 'platform' ? <Badge variant="secondary">平台</Badge> : <span className="text-muted-foreground">{prompt.ownerName}</span>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{prompt.description}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{prompt.scope}</Badge>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(prompt.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyId(prompt.id)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
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
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={fetchPrompts}
                prompt={selectedPrompt}
            />
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            您确定要删除提示词 “{selectedPrompt?.name}” 吗？此操作不可撤销。
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
