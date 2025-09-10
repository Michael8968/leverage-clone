'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth';
import { Construction, Frown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function CreatorWorkbench() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-headline font-bold mb-4">创意者工作台</h1>
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">任务与需求</TabsTrigger>
          <TabsTrigger value="3d-creation">3D AI 创作</TabsTrigger>
          <TabsTrigger value="submissions">我的提交</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">任务与需求</CardTitle>
              <CardDescription>浏览平台上的公开需求，接受你感兴趣的任务。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <Construction className="w-16 h-16 mb-4" />
                <p>任务列表正在开发中，即将上线。</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="3d-creation">
           <Card>
            <CardHeader>
              <CardTitle className="font-headline">3D AI 创作</CardTitle>
              <CardDescription>输入文本提示，利用AI快速生成3D模型参考。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <Construction className="w-16 h-16 mb-4" />
                <p>3D AI 创作工具正在开发中，敬请期待。</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="submissions">
           <Card>
            <CardHeader>
              <CardTitle className="font-headline">我的提交</CardTitle>
              <CardDescription>管理你已提交并被采纳的作品。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <Construction className="w-16 h-16 mb-4" />
                <p>作品管理功能正在开发中。</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


function RestrictedAccess() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Frown className="w-16 h-16 mb-4 text-destructive"/>
            <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
            <p className="text-muted-foreground">此页面仅对“创意者”角色的用户开放。</p>
        </div>
    );
}

export default function CreatorWorkbenchPage() {
    const { role } = useAuthStore();
    const router = useRouter();

    // In a real app, you might want a more robust solution,
    // but this check is sufficient for demonstration.
    useEffect(() => {
        if (!role) {
            router.push('/login');
        }
    }, [role, router]);


    if (role !== 'creator') {
        return (
            <AppLayout>
                <RestrictedAccess />
            </AppLayout>
        );
    }
    
    return (
        <AppLayout>
            <CreatorWorkbench />
        </AppLayout>
    );
}
