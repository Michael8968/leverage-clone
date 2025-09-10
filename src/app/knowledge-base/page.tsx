
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, Edit, Filter, PlusCircle, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProductService } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function KnowledgeBasePage() {
    const [knowledgeItems, setKnowledgeItems] = useState<ProductService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchKnowledgeItems = async () => {
            setIsLoading(true);
            try {
                const productsCollection = collection(db, 'products');
                const productSnapshot = await getDocs(productsCollection);
                const productsList = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductService));
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
        };

        fetchKnowledgeItems();
    }, [toast]);

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
                            <Button disabled>
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
                                    <TableHead>标签</TableHead>
                                    <TableHead>最后更新</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
                                        <TableCell className="text-muted-foreground text-xs">N/A</TableCell>
                                        <TableCell>{format(new Date(), 'yyyy-MM-dd')}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled>
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
        </AppLayout>
    );
}

    