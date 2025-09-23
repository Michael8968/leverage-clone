
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Edit, Library, Link, PlusCircle, Trash2, Upload, Loader2, Info, Tag, CalendarClock } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { X } from 'lucide-react';

// 更新后的 Resource 数据接口，以反映其作为数据源的本质
export interface Resource {
    id: string;
    name: string; // 数据源名称，例如：“科技媒体头条”
    sourceUrl: string; // 原始数据来源网址
    category: string; // 资讯类别，例如：“人工智能”, “元宇宙”
    tags: string[]; // 标签数组
    updateFrequency: '实时' | '每日' | '每周' | '每月'; // 更新频率
    status: '可用' | '已停用'; // 状态
    createdAt?: Timestamp;
}

// 更新 Zod schema 以匹配新的数据模型
const resourceSchema = z.object({
  name: z.string().min(2, "数据源名称至少需要2个字符"),
  sourceUrl: z.string().url("请输入有效的来源URL"),
  category: z.string().min(1, "类别不能为空"),
  tags: z.string().min(1, "至少需要一个标签").transform(val => val.split(/,|，|\s+/).filter(Boolean)), // 将逗号/空格分隔的字符串转换为数组
  updateFrequency: z.enum(['实时', '每日', '每周', '每月']),
  status: z.enum(['可用', '已停用']),
});

function ResourceDialog({ resource, open, onOpenChange, onSave }: {
    resource: Partial<Resource> | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const isEditing = !!resource?.id;

    const form = useForm<z.infer<typeof resourceSchema>>({
        resolver: zodResolver(resourceSchema),
        defaultValues: {
            name: '',
            sourceUrl: '',
            category: '',
            tags: '',
            updateFrequency: '每日',
            status: '可用',
        },
    });

    useEffect(() => {
        if (open && resource) {
            form.reset({
                ...resource,
                tags: Array.isArray(resource.tags) ? resource.tags.join(', ') : '',
            });
        } else if (!open) {
            form.reset({
                name: '',
                sourceUrl: '',
                category: '',
                tags: '',
                updateFrequency: '每日',
                status: '可用',
            });
        }
    }, [open, resource, form]);


    const handleSubmit = async (values: z.infer<typeof resourceSchema>) => {
        setIsSubmitting(true);
        try {
            const dataToSave: Omit<Resource, 'id'> = { ...values, createdAt: serverTimestamp() } as any;

            if(isEditing) {
                const docRef = doc(db, 'resources', resource!.id!);
                // Omit createdAt on update
                const { createdAt, ...updateData } = dataToSave;
                await updateDoc(docRef, updateData);
                toast({ title: "成功", description: "数据源已更新。" });
            } else {
                await addDoc(collection(db, 'resources'), dataToSave);
                toast({ title: "成功", description: "新数据源已添加。" });
            }
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving resource:", error);
            toast({ title: "保存失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditing ? '编辑数据源' : '新增数据源'}</DialogTitle>
                    <DialogDescription>
                        添加和配置用于AI分析的外部行业资讯数据源。
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>数据源名称</FormLabel><FormControl><Input placeholder="例如：前沿科技动态" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="sourceUrl" render={({ field }) => (<FormItem><FormLabel>数据来源 URL</FormLabel><FormControl><Input placeholder="https://example.com/data-feed" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>资讯类别</FormLabel><FormControl><Input placeholder="例如：人工智能" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="tags" render={({ field }) => (<FormItem><FormLabel>标签 (用逗号或空格分隔)</FormLabel><FormControl><Input placeholder="例如: AI, 融资, 新产品" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="updateFrequency" render={({ field }) => (<FormItem><FormLabel>更新频率</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="实时">实时</SelectItem><SelectItem value="每日">每日</SelectItem><SelectItem value="每周">每周</SelectItem><SelectItem value="每月">每月</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>状态</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="可用">可用</SelectItem><SelectItem value="已停用">已停用</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                        </div>
                        
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

const getStatusBadge = (status: Resource['status']) => {
    switch (status) {
        case '可用':
            return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{status}</Badge>;
        case '已停用':
            return <Badge variant="destructive">{status}</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
}

export default function PublicResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const { toast } = useToast();

    const fetchResources = useCallback(async () => {
        setIsLoading(true);
        try {
            const resourcesCollection = collection(db, 'resources');
            const q = query(resourcesCollection, orderBy('name'));
            const resourcesSnapshot = await getDocs(q);
            const resourcesList = resourcesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                } as Resource;
            });
            setResources(resourcesList);
        } catch (error) {
            console.error("Error fetching resources:", error);
            toast({
                title: '加载失败',
                description: '无法加载数据源列表，请检查数据库连接或稍后重试。',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const handleAdd = () => {
        setSelectedResource(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (resource: Resource) => {
        setSelectedResource(resource);
        setIsDialogOpen(true);
    };
    
    const handleDelete = (resource: Resource) => {
        setSelectedResource(resource);
        setIsAlertOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedResource) return;
        try {
            await deleteDoc(doc(db, 'resources', selectedResource.id));
            toast({ title: "成功", description: "数据源已删除。" });
            fetchResources();
        } catch (error) {
             toast({ title: "删除失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsAlertOpen(false);
            setSelectedResource(null);
        }
    };

    return (
        <AppLayout>
            <div className="p-4 md:p-8 space-y-8">
                <header>
                    <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
                        <Library />
                        行业资讯数据中心
                    </h1>
                    <p className="text-muted-foreground">管理用于增强AI能力的外部行业数据源。在这里收集、整理、分类并为数据打上标签，为AI在各种场景下的交互体验提供数据依据。</p>
                </header>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="font-headline">数据源列表</CardTitle>
                                <CardDescription>管理所有用于AI分析的外部数据源。</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" disabled><Upload className="mr-2"/> 导入</Button>
                                <Button onClick={handleAdd}>
                                    <PlusCircle className="mr-2" />
                                    新增数据源
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>数据源名称</TableHead>
                                    <TableHead>类别</TableHead>
                                    <TableHead>标签</TableHead>
                                    <TableHead>更新频率</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                     Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24 rounded-md" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-48 rounded-md" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : resources.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            暂无数据源。请点击“新增数据源”按钮添加。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    resources.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{item.name}</span>
                                                    <Button variant="link" size="sm" asChild className="p-0 h-auto justify-start" disabled={!item.sourceUrl}>
                                                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            查看来源 <Link className="w-3 h-3"/>
                                                        </a>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.category}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                   {(item.tags || []).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <CalendarClock className="w-4 h-4"/>
                                                    <span>{item.updateFrequency}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item)}>
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
            <ResourceDialog 
                key={selectedResource?.id || 'new'}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={fetchResources}
                resource={selectedResource}
            />
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            您确定要删除数据源 “{selectedResource?.name}” 吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedResource(null)}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">确认</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
