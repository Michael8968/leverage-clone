'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// 定义 Prompt 数据的 TypeScript 接口
interface Prompt {
    id: string;
    name: string;
    description: string;
    scope: string;
    status: '生效中' | '草稿' | '已停用';
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
    const { toast } = useToast();

    useEffect(() => {
        const fetchPrompts = async () => {
            setIsLoading(true);
            // ==> DEBUG LOG 1: Announce the start of the fetch operation
            console.log("[DB_TEST] Attempting to fetch documents from 'prompts' collection...");

            try {
                const promptsCollection = collection(db, 'prompts');
                const q = query(promptsCollection, orderBy('name'));
                const promptsSnapshot = await getDocs(q);

                // ==> DEBUG LOG 2: Report success and the number of documents found
                console.log(`[DB_TEST] Successfully fetched ${promptsSnapshot.size} documents.`);
                
                if (promptsSnapshot.empty) {
                    console.warn("[DB_TEST] The 'prompts' collection is empty or does not exist in the 'a001' database.");
                }

                const promptsList = promptsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Prompt));
                setPrompts(promptsList);

            } catch (error) {
                // ==> DEBUG LOG 3: Report failure and log the detailed error object
                console.error("[DB_TEST] Failed to fetch documents. Error:", error);
                
                toast({
                    title: '加载失败',
                    description: '无法加载提示词列表，请检查数据库连接或稍后重试。详细信息请查看开发者控制台。',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrompts();
    }, [toast]);

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
                                            数据库中暂无提示词。请在 Firestore 中创建 'prompts' 集合并添加数据。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    prompts.map((prompt) => (
                                        <TableRow key={prompt.id}>
                                            <TableCell className="font-medium">{prompt.name}</TableCell>
                                            <TableCell className="font-mono text-xs">{prompt.id}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{prompt.description}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{prompt.scope}</Badge>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(prompt.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                                        <Copy className="h-4 w-4" />
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
