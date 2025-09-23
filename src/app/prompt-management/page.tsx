
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

import { Edit, Trash2, Copy, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';


// 定义 Prompt 数据的 TypeScript 接口
interface Prompt {
    id: string;
    name: string;
    description: string;
    scope: string;
    status: '生效中' | '草稿' | '已停用';
    content: string;
}

const promptSchema = z.object({
  name: z.string().min(2, "名称至少需要2个字符"),
  description: z.string().min(5, "描述至少需要5个字符"),
  scope: z.string().min(2, "范围不能为空"),
  status: z.enum(['生效中', '草稿', '已停用']),
  content: z.string().min(20, "提示词内容至少需要20个字符"),
});


function PromptEditDialog({ prompt, open, onOpenChange, onSave }: {
    prompt: Prompt | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof promptSchema>>({
        resolver: zodResolver(promptSchema),
    });

    useEffect(() => {
        if (open && prompt) {
            form.reset(prompt);
        }
    }, [open, prompt, form]);

    const handleSubmit = async (values: z.infer<typeof promptSchema>) => {
        if (!prompt) return;
        setIsSubmitting(true);
        try {
            const docRef = doc(db, 'prompts', prompt.id);
            await updateDoc(docRef, values);
            toast({ title: "成功", description: "提示词已更新。" });
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Error updating prompt:", error);
            toast({ title: "更新失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">编辑提示词: {prompt?.name}</DialogTitle>
                    <DialogDescription>
                        修改提示词的详细信息。请谨慎操作，这将直接影响相关AI功能的行为。
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
                                保存更改
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

export default function PromptManagementPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const { toast } = useToast();

    const fetchPrompts = async () => {
        setIsLoading(true);
        try {
            const promptsCollection = collection(db, 'prompts');
            const q = query(promptsCollection, orderBy('name'));
            const promptsSnapshot = await getDocs(q);

            if (promptsSnapshot.empty) {
                console.warn("[DB_TEST] The 'prompts' collection is empty or does not exist.");
            }

            const promptsList = promptsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Prompt));
            setPrompts(promptsList);

        } catch (error) {
            console.error("Failed to fetch prompts:", error);
            toast({
                title: '加载失败',
                description: '无法加载提示词列表，请检查数据库连接或稍后重试。',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrompts();
    }, [toast]);
    
    const handleEdit = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setIsDialogOpen(true);
    };
    
    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        toast({ title: "已复制", description: "提示词ID已复制到剪贴板。" });
    }

    return (
        <AppLayout>
            <div className="p-4 md:p-8">
                <header className="mb-8">
                    <h1 className="text-2xl font-headline font-bold">提示词工程配置</h1>
                    <p className="text-muted-foreground">平台方可在此集中配置、管理不同业务场景下使用的专业提示词（Prompt）。</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">提示词库</CardTitle>
                        <CardDescription>管理系统中所有生效的AI提示词。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>提示词名称</TableHead>
                                    <TableHead>提示词ID</TableHead>
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
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : prompts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            数据库中暂无提示词。请运行 `node scripts/seed-prompts.js` 脚本填充初始数据。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    prompts.map((prompt) => (
                                        <TableRow key={prompt.id}>
                                            <TableCell className="font-medium">{prompt.name}</TableCell>
                                            <TableCell className="font-mono text-xs flex items-center gap-2">
                                                <span>{prompt.id}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyId(prompt.id)}>
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{prompt.description}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{prompt.scope}</Badge>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(prompt.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(prompt)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled>
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
        </AppLayout>
    );
}
