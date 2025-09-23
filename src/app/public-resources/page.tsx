

'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Edit, Library, Link, PlusCircle, Trash2, Upload, Loader2, Info, Tag, CalendarClock, FileCog, FileJson, Server } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataProcessor } from '@/components/features/data-processor';
import { Textarea } from '@/components/ui/textarea';
import GenerateJson from '../api/generate/generate.json';


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
    // Fields from DataProcessor might also be present
    matchScore?: number;
    recommendation?: string;
    apiKey?: string;
}

// 更新 Zod schema 以匹配新的数据模型
const resourceSchema = z.object({
  name: z.string().min(2, "数据源名称至少需要2个字符"),
  sourceUrl: z.string().url("请输入有效的来源URL"),
  apiKey: z.string().optional(),
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
            apiKey: '',
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
                apiKey: '',
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
                        <FormField control={form.control} name="apiKey" render={({ field }) => (<FormItem><FormLabel>API Key (可选)</FormLabel><FormControl><Input type="password" placeholder="如果需要，输入API Key" {...field} /></FormControl><FormMessage /></FormItem>)}/>
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

function ManualResourceManagement() {
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
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="font-headline">数据源列表</CardTitle>
                        <CardDescription>管理所有用于AI分析的外部数据源。</CardDescription>
                    </div>
                    <Button onClick={handleAdd}>
                        <PlusCircle className="mr-2" />
                        新增数据源
                    </Button>
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
                                            {item.sourceUrl && (
                                                <Button variant="link" size="sm" asChild className="p-0 h-auto justify-start" disabled={!item.sourceUrl}>
                                                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        查看来源 <Link className="w-3 h-3"/>
                                                    </a>
                                                </Button>
                                            )}
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
        </Card>
    );
}

function ApiDataFetcher() {
    const [availableResources, setAvailableResources] = useState<Resource[]>([]);
    const [selectedResourceId, setSelectedResourceId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [jsonInput, setJsonInput] = useState(JSON.stringify(GenerateJson, null, 2));
    const [responseData, setResponseData] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAvailableResources = async () => {
            setIsLoading(true);
            try {
                const resourcesCollection = collection(db, 'resources');
                const q = query(resourcesCollection, where("status", "==", "可用"));
                const snapshot = await getDocs(q);
                const resourcesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
                setAvailableResources(resourcesList);
            } catch (error) {
                toast({ title: '加载失败', description: '无法加载可用的数据源列表。', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchAvailableResources();
    }, [toast]);

    useEffect(() => {
        if (selectedResourceId) {
            const resource = availableResources.find(r => r.id === selectedResourceId);
            if (resource) {
                try {
                    const parsedJson = JSON.parse(jsonInput);
                    parsedJson.url = resource.sourceUrl;
                    if(resource.apiKey) {
                        parsedJson.headers = {
                            ...parsedJson.headers,
                            'Authorization': `Bearer ${resource.apiKey}`,
                        }
                    }
                    setJsonInput(JSON.stringify(parsedJson, null, 2));
                } catch(e) {
                    // ignore if json is invalid
                }
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedResourceId, availableResources]);

    const handleFetchData = async () => {
        let payload;
        try {
            payload = JSON.parse(jsonInput);
        } catch (error) {
            toast({ title: 'JSON 格式错误', description: '请输入有效的JSON配置。', variant: 'destructive'});
            return;
        }

        setIsFetching(true);
        setResponseData(null);
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                 throw new Error(data.details || 'API请求失败');
            }

            setResponseData(data);
            toast({ title: '成功', description: `已成功调用接口。` });
        } catch (error: any) {
            console.error("API fetch error:", error);
            setResponseData({ error: `获取数据失败: ${error.message}` });
            toast({ title: '获取失败', description: '无法从该接口获取数据，请检查配置和网络连接。', variant: 'destructive' });
        } finally {
            setIsFetching(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">通用接口数据调试</CardTitle>
                <CardDescription>通过构造JSON对象来调用任意RESTful API，实现对多种接口模式的通用解析和调试。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-2">
                        <FormLabel>选择数据源 (自动填充 URL/Key)</FormLabel>
                        <Select onValueChange={setSelectedResourceId} value={selectedResourceId} disabled={isLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoading ? '加载中...' : '选择一个已配置的数据源...'} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableResources.map(res => (
                                    <SelectItem key={res.id} value={res.id}>{res.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <FormLabel>JSON 请求配置</FormLabel>
                        <Textarea 
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            rows={8}
                            placeholder='输入JSON格式的请求配置...'
                            className="font-mono text-xs"
                        />
                    </div>
                </div>

                <Button onClick={handleFetchData} disabled={isFetching} className="w-full">
                    {isFetching ? <Loader2 className="animate-spin" /> : <Server className="mr-2" />}
                    发送请求
                </Button>

                {responseData && (
                    <div className="space-y-2 pt-4">
                        <h4 className="font-medium flex items-center gap-2"><FileJson className="w-5 h-5"/> 响应数据</h4>
                        <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96">
                            {JSON.stringify(responseData, null, 2)}
                        </pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


export default function PublicResourcesPage() {
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

                 <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-xl">
                        <TabsTrigger value="manual"><Library className="mr-2"/> 数据源列表</TabsTrigger>
                        <TabsTrigger value="batch"><FileCog className="mr-2"/> 批量导入处理</TabsTrigger>
                        <TabsTrigger value="api"><Server className="mr-2"/> 接口数据调试</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="mt-6">
                        <ManualResourceManagement />
                    </TabsContent>
                    <TabsContent value="batch" className="mt-6">
                        <DataProcessor className="mt-0" destination="resources" />
                    </TabsContent>
                    <TabsContent value="api" className="mt-6">
                        <ApiDataFetcher />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
