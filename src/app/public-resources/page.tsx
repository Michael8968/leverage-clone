'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Edit, Library, Link, PlusCircle, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// 定义 Resource 数据的 TypeScript 接口
interface Resource {
    id: string;
    name: string;
    endpoint: string;
    authType: string;
    status: '生效中' | '已停用';
    docsUrl?: string;
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
    const { toast } = useToast();

    useEffect(() => {
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
        fetchResources();
    }, [toast]);

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
                                <Button disabled>
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
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 rounded-md ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : resources.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            数据库中暂无资源。请在 Firestore 中创建 'resources' 集合并添加数据。
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
                                                <Button variant="link" size="sm" asChild className="p-0 h-auto" disabled={!item.docsUrl}>
                                                    <a href={item.docsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm">
                                                        查看文档 <Link className="w-3 h-3"/>
                                                    </a>
                                                </Button>
                                            </TableCell>
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
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
