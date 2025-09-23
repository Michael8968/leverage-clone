
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Edit, Library, Link, PlusCircle, Trash2, Upload, Loader2, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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


// 定义 Resource 数据的 TypeScript 接口
export interface Resource {
    id: string;
    name: string;
    endpoint: string;
    authType: 'API Key' | 'OAuth' | 'None';
    status: '生效中' | '已停用';
    docsUrl?: string;
    apiKey?: string;
}

const resourceSchema = z.object({
  name: z.string().min(2, "名称至少需要2个字符"),
  endpoint: z.string().url("请输入有效的URL"),
  docsUrl: z.string().url("请输入有效的文档URL").optional().or(z.literal('')),
  authType: z.enum(['API Key', 'OAuth', 'None']),
  status: z.enum(['生效中', '已停用']),
  apiKey: z.string().optional(),
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
            endpoint: '',
            docsUrl: '',
            authType: 'None',
            status: '生效中',
            apiKey: ''
        },
    });

    useEffect(() => {
        if (open && resource) {
            form.reset(resource);
        } else if (!open) {
            form.reset();
        }
    }, [open, resource, form]);


    const handleSubmit = async (values: z.infer<typeof resourceSchema>) => {
        setIsSubmitting(true);
        try {
            if (isEditing) {
                const docRef = doc(db, 'resources', resource!.id!);
                await updateDoc(docRef, values);
                toast({ title: "成功", description: "资源已更新。" });
            } else {
                await addDoc(collection(db, 'resources'), { ...values, createdAt: serverTimestamp() });
                toast({ title: "成功", description: "新资源已添加。" });
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditing ? '编辑接口资源' : '新增接口资源'}</DialogTitle>
                    <DialogDescription>
                        请填写接口的详细信息。API Key等敏感信息将被安全存储。
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>接口名称</FormLabel><FormControl><Input placeholder="例如：Tripo3D API" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="endpoint" render={({ field }) => (<FormItem><FormLabel>端点 (Endpoint)</FormLabel><FormControl><Input placeholder="https://api.example.com/v1" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="docsUrl" render={({ field }) => (<FormItem><FormLabel>相关文档 URL</FormLabel><FormControl><Input placeholder="https://docs.example.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="authType" render={({ field }) => (<FormItem><FormLabel>认证方式</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="选择认证方式" /></SelectTrigger></FormControl><SelectContent><SelectItem value="API Key">API Key</SelectItem><SelectItem value="OAuth">OAuth</SelectItem><SelectItem value="None">None</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>状态</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger></FormControl><SelectContent><SelectItem value="生效中">生效中</SelectItem><SelectItem value="已停用">已停用</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                        </div>
                         {form.watch('authType') === 'API Key' && (
                            <FormField control={form.control} name="apiKey" render={({ field }) => (<FormItem><FormLabel>API Key</FormLabel><FormControl><Input type="password" placeholder="输入您的 API Key" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         )}
                        <DialogFooter className="pt-4">
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
        case '生效中':
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

    const fetchResources = async () => {
        setIsLoading(true);
        try {
            const resourcesCollection = collection(db, 'resources');
            const q = query(resourcesCollection, orderBy('name'));
            const resourcesSnapshot = await getDocs(q);
            const resourcesList = resourcesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Resource));
            setResources(resourcesList);
        } catch (error) {
            console.error("Error fetching resources:", error);
            toast({
                title: '加载失败',
                description: '无法加载资源列表，请检查数据库连接或稍后重试。',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchResources();
    }, [toast]);

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
            toast({ title: "成功", description: "资源已删除。" });
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
                        公共资源库管理
                    </h1>
                    <p className="text-muted-foreground">管理外部链接、API接口及其他关联信息，支持批量导入和导出，丰富AI的数据维度。</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">资源列表</CardTitle>
                        <CardDescription>管理所有外部链接和API接口。</CardDescription>
                        <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center gap-2 border-b">
                               <Button variant="ghost" className="rounded-b-none text-muted-foreground" disabled>外部链接</Button>
                               <Button variant="ghost" className="rounded-b-none border-b-2 border-primary">API 接口</Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" disabled><Upload className="mr-2"/> 导入</Button>
                                <Button variant="outline" disabled><Download className="mr-2"/> 导出</Button>
                                <Button onClick={handleAdd}>
                                    <PlusCircle className="mr-2" />
                                    新增接口
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>接口名称</TableHead>
                                    <TableHead>端点 (Endpoint)</TableHead>
                                    <TableHead>认证方式</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>API Key</TableHead>
                                    <TableHead>相关文档</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                     Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : resources.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            数据库中暂无资源。请点击“新增接口”按钮添加。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    resources.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{item.endpoint}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.authType}</Badge>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell>
                                                {item.apiKey ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><KeyRound className="w-3 h-3 text-green-500"/> 已配置</span> : <span className="text-xs text-muted-foreground/50">未配置</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="link" size="sm" asChild className="p-0 h-auto" disabled={!item.docsUrl}>
                                                    <a href={item.docsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm">
                                                        查看文档 <Link className="w-3 h-3"/>
                                                    </a>
                                                </Button>
                                            </TableCell>
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
                            您确定要删除资源 “{selectedResource?.name}” 吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">确认</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

    