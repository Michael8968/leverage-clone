
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Edit, Library, Link, PlusCircle, Trash2, Upload } from 'lucide-react';

const resources = [
    {
        name: 'TechCrunch - 最新科技新闻',
        url: 'https://techcrunch.com/',
        description: '提供技术和创业公司新闻、分析和观点。',
        category: '科技新闻',
        lastUpdated: '2024-07-28',
    },
    {
        name: '中国家电网',
        url: 'http://www.cheaa.com/',
        description: '中国家用电器协会主办的官方网站，提供行业动态和数据。',
        category: '行业资讯',
        lastUpdated: '2024-07-28',
    },
    {
        name: 'Statista - 市场数据统计',
        url: 'https://www.statista.com/',
        description: '全球领先的商业数据平台，提供各类市场和消费者数据。',
        category: '数据分析',
        lastUpdated: '2024-07-27',
    },
];


export default function PublicResourcesPage() {
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
                            <div className="flex items-center gap-2">
                               <Button variant="outline"><Link className="mr-2"/> 添加链接</Button>
                               <Button variant="outline">API 接口</Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost"><Upload className="mr-2"/> 导入</Button>
                                <Button variant="ghost"><Download className="mr-2"/> 导出</Button>
                                <Button>
                                    <PlusCircle className="mr-2" />
                                    新增链接
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>名称</TableHead>
                                    <TableHead>URL</TableHead>
                                    <TableHead>描述</TableHead>
                                    <TableHead>类别</TableHead>
                                    <TableHead>最后更新</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resources.map((item) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{item.url}</a></TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{item.description}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{item.category}</Badge>
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

