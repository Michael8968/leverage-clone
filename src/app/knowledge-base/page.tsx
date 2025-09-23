
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, Edit, Filter, PlusCircle, Search, Trash2, Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProductService } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


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

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================
export default function KnowledgeBasePage() {
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
        <AppLayout>
            <div className="p-4 md:p-8 space-y-8">
                <header>
                    <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
                        <Database />
                        知识库管理系统
                    </h1>
                    <p className="text-muted-foreground">在此增、改、删知识条目。知识库支持标签化管理，并可由AI辅助进行维护，为智能匹配和智能搜索提供数据基础。</p>
                </header>

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
            </div>
            
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
        </AppLayout>
    );
}
