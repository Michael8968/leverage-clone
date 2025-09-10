
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, Edit, Filter, PlusCircle, Search, Trash2 } from 'lucide-react';

const knowledgeItems = [
    {
        name: '智能家庭中心 Pro',
        category: '消费电子产品',
        tags: ['智能家居', '语音助手', 'Zigbee'],
        lastUpdated: '2024-07-28',
    },
    {
        name: '静音大师洗衣机',
        category: '家用电器',
        tags: ['节能', '直流变频', '10公斤'],
        lastUpdated: '2024-07-27',
    },
    {
        name: '云端数据备份服务',
        category: '软件服务',
        tags: ['SaaS', '数据安全', '多设备同步'],
        lastUpdated: '2024-07-26',
    },
    {
        name: '个性化营养咨询',
        category: '健康服务',
        tags: ['在线咨询', '营养师', '定制方案'],
        lastUpdated: '2024-07-25',
    },
    {
        name: '便携式咖啡机',
        category: '生活电器',
        tags: ['户外', '旅行', '手动'],
        lastUpdated: '2024-07-24',
    }
];

export default function KnowledgeBasePage() {
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
                                <Button variant="outline">
                                    <Filter className="mr-2 h-4 w-4" />
                                    筛选
                                </Button>
                            </div>
                            <Button>
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
                                {knowledgeItems.map((item) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {item.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{item.lastUpdated}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Edit className="h-4 w-4" />
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
