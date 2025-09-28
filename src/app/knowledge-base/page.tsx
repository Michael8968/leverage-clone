

'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, Edit, Filter, PlusCircle, Search, Trash2, Loader2, Library, FileCog, Server, FileJson } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProductService, Resource } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataProcessor } from '@/components/features/data-processor';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GenerateJson from '../api/generate/generate.json';


// =================================================================
// ZOD SCHEMA & DIALOG COMPONENT
// =================================================================
const knowledgeItemSchema = z.object({
  name: z.string().min(2, "名称至少需要2个字符。"),
  description: z.string().min(10, "描述至少需要10个字符。"),
  price: z.preprocess(
    (val) => val ? parseFloat(String(val)) : 0,
    z.number({ invalid_error: "价格必须是一个数字。" }).nonnegative({ message: "价格不能为负数。" })
  ),
  category: z.string().min(1, "类别不能为空。"),
  purchaseUrl: z.string().url("请输入有效的URL。").optional().or(z.literal('')),
});

function KnowledgeItemDialog({ item, open, onOpenChange, onSave }: {
    item: Partial<ProductService> | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const isEditing = !!item?.id;

    const form = useForm<z.infer<typeof knowledgeItemSchema>>({
        resolver: zodResolver(knowledgeItemSchema),
        defaultValues: { name: '', description: '', price: 0, category: '未分类', purchaseUrl: '' },
    });

    useEffect(() => {
        if (open && item) {
            form.reset(item);
        } else if (!open) {
            form.reset();
        }
    }, [open, item, form]);

    const handleSubmit = async (values: z.infer<typeof knowledgeItemSchema>) => {
        setIsSubmitting(true);
        try {
            if (isEditing) {
                await updateDoc(doc(db, 'products', item!.id!), { ...values });
                toast({ title: "成功", description: "知识条目已更新。" });
            } else {
                await addDoc(collection(db, 'products'), { ...values, createdAt: serverTimestamp() });
                toast({ title: "成功", description: "新知识条目已添加。" });
            }
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving knowledge item:", error);
            toast({ title: "保存失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditing ? '编辑知识条目' : '新增知识条目'}</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                       <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>名称</FormLabel><FormControl><Input placeholder="产品或服务名称" {...field} /></FormControl><FormMessage /></FormItem>)} />
                       <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>描述</FormLabel><FormControl><Textarea placeholder="详细描述..." {...field} rows={4} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>类别</FormLabel><FormControl><Input placeholder="例如：3D模型" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>价格 (元)</FormLabel><FormControl><Input type="number" placeholder="99.99" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="purchaseUrl" render={({ field }) => (<FormItem><FormLabel>购买链接 (可选)</FormLabel><FormControl><Input placeholder="https://example.com/product/..." {...field} /></FormControl><FormMessage /></FormItem>)} />
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
    )
}

function KnowledgeBaseList() {
    const [knowledgeItems, setKnowledgeItems] = useState<ProductService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ProductService | null>(null);
    const { toast } = useToast();

    const fetchKnowledgeItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const productsCollection = collection(db, 'products');
            const productSnapshot = await getDocs(productsCollection);
            const productsList = productSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                } as ProductService;
            });
            setKnowledgeItems(productsList);
        } catch (error) {
            console.error("Error fetching knowledge base items:", error);
            toast({
                title: "加载失败",
                description: "无法从数据库加载知识库条目。",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchKnowledgeItems();
    }, [fetchKnowledgeItems]);
    
    const handleAdd = () => {
        setSelectedItem(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (item: ProductService) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };
    
    const handleDelete = (item: ProductService) => {
        setSelectedItem(item);
        setIsAlertOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedItem) return;
        try {
            await deleteDoc(doc(db, 'products', selectedItem.id));
            toast({ title: "成功", description: "条目已删除。" });
            fetchKnowledgeItems(); // Refresh list
        } catch (error) {
             toast({ title: "删除失败", description: "操作失败，请重试。", variant: "destructive" });
        } finally {
            setIsAlertOpen(false);
            setSelectedItem(null);
        }
    };
    
    const handleSave = () => {
        setIsDialogOpen(false);
        setSelectedItem(null);
        fetchKnowledgeItems(); // Refresh list after save
    };

     return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">知识条目列表</CardTitle>
                    <CardDescription>管理所有产品、服务及相关知识。</CardDescription>
                    <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="搜索条目名称或标签..." className="pl-8 w-64" />
                            </div>
                            <Button variant="outline" disabled>
                                <Filter className="mr-2 h-4 w-4" />
                                筛选
                            </Button>
                        </div>
                        <Button onClick={handleAdd}>
                            <PlusCircle className="mr-2" />
                            新增条目
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>条目名称</TableHead>
                                <TableHead>类别</TableHead>
                                <TableHead>价格 (元)</TableHead>
                                <TableHead>创建/更新</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : knowledgeItems.length === 0 ? (
                                    <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        知识库中暂无条目。
                                    </TableCell>
                                </TableRow>
                            ) : (
                                knowledgeItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{item.category}</Badge>
                                    </TableCell>
                                    <TableCell>{item.price.toLocaleString()}</TableCell>
                                    <TableCell>{item.createdAt ? format(item.createdAt, 'yyyy-MM-dd') : 'N/A'}</TableCell>
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
                            )))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <KnowledgeItemDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSave}
                item={selectedItem}
            />

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            您确定要删除条目 “{selectedItem?.name}” 吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedItem(null)}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">确认删除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
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
                        <Label>选择数据源 (自动填充 URL/Key)</Label>
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
                        <Label>JSON 请求配置</Label>
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

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================
export default function KnowledgeBasePage() {
    return (
        <AppLayout>
            <div className="p-4 md:p-8 space-y-8">
                <header>
                    <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
                        <Database />
                        知识库管理系统
                    </h1>
                    <p className="text-muted-foreground">在此增、改、删知识条目。知识库支持标签化管理，并可由AI辅助进行维护，为智能浏览和检索引擎提供数据基础。</p>
                </header>
                 <Tabs defaultValue="list" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-xl">
                        <TabsTrigger value="list"><Library className="mr-2"/>知识条目列表</TabsTrigger>
                        <TabsTrigger value="batch"><FileCog className="mr-2"/>批量导入</TabsTrigger>
                        <TabsTrigger value="external"><Server className="mr-2"/>对接外部知识库</TabsTrigger>
                    </TabsList>
                    <TabsContent value="list" className="mt-6">
                        <KnowledgeBaseList />
                    </TabsContent>
                    <TabsContent value="batch" className="mt-6">
                        <DataProcessor destination="products" />
                    </TabsContent>
                    <TabsContent value="external" className="mt-6">
                        <ApiDataFetcher />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
