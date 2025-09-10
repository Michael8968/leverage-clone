
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Copy, Power } from 'lucide-react';

const prompts = [
    {
        name: '用户画像生成',
        id: 'generateUserProfilePrompt',
        description: '根据用户输入生成用户画像的提示模板。',
        scope: '智能匹配',
        status: '生效中',
    },
    {
        name: '产品服务推荐',
        id: 'recommendProductsOrServicesPrompt',
        description: '分析用户信息并推荐产品或服务的提示模板。',
        scope: '智能匹配',
        status: '生效中',
    },
    {
        name: '智能搜索',
        id: 'intelligentSearchPrompt',
        description: '在知识库中进行智能搜索的提示模板。',
        scope: '智能搜索',
        status: '草稿',
    },
    {
        name: '供应商评估',
        id: 'processSupplierDataPrompt',
        description: '解析CSV数据并评估供应商资质。',
        scope: '供应商中心',
        status: '已停用',
    },
];

const getStatusBadge = (status: string) => {
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
                                {prompts.map((prompt) => (
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
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

