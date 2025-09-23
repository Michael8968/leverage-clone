'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth';
import { Frown, Bot, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Demand } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// =================================================================
// TASKS TAB - The only component being actively developed in this step
// =================================================================
function TasksTab() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();

  const fetchOpenDemands = useCallback(async () => {
    setIsLoading(true);
    try {
      const demandsCollection = collection(db, 'demands');
      const q = query(demandsCollection, where("status", "==", "开放中"));
      const demandSnapshot = await getDocs(q);
      const demandsList = demandSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Demand));
      setDemands(demandsList);
    } catch (error) {
      console.error("Error fetching open demands:", error);
      toast({ title: '加载失败', description: '无法加载任务列表。', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOpenDemands();
  }, [fetchOpenDemands]);

  const handleAcceptTask = async (demandId: string) => {
    if (!user) {
      toast({ title: '错误', description: '您需要登录才能接受任务。', variant: 'destructive' });
      return;
    }
    setAcceptingTaskId(demandId);
    try {
      const demandRef = doc(db, "demands", demandId);
      await updateDoc(demandRef, {
        status: "进行中",
        creatorId: user.uid,
      });
      toast({ title: "任务已接受！", description: "您已成功接受任务，请开始创作吧！" });
      await fetchOpenDemands();
    } catch (error) {
      console.error("Error accepting task:", error);
      toast({ title: '操作失败', description: '接受任务时发生错误，请重试。', variant: 'destructive' });
    } finally {
      setAcceptingTaskId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">任务需求池</CardTitle>
        <CardDescription>查看平台发布的任务以及开放的需求，选择您感兴趣的进行创作。</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>任务标题</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>酬金</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : demands.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">当前暂无开放的需求。</TableCell>
                    </TableRow>
                ) : (
                    demands.map(demand => (
                        <TableRow key={demand.id}>
                            <TableCell className="font-medium">{demand.title}</TableCell>
                            <TableCell>{demand.category}</TableCell>
                            <TableCell>¥{demand.budget.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleAcceptTask(demand.id)}
                                  disabled={acceptingTaskId === demand.id}
                                >
                                  {acceptingTaskId === demand.id ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                  接受任务
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// =================================================================
// Unmodified Components (Static Placeholders)
// =================================================================

function CreationForm() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">3D AI 创作</CardTitle>
                <CardDescription>此功能正在开发中，敬请期待。</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground p-12">
                <Bot className="h-16 w-16 mx-auto mb-4" />
                <p>即将推出 AI 辅助创作工具</p>
            </CardContent>
        </Card>
    );
}

function SubmissionsTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">我的提交</CardTitle>
                <CardDescription>此功能正在开发中，敬请期待。</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground p-12">
                <Frown className="h-16 w-16 mx-auto mb-4" />
                <p>您提交的作品将在这里展示</p>
            </CardContent>
        </Card>
    );
}

// =================================================================
// Parent Component and Page Entrypoint
// =================================================================
function CreatorWorkbench() {
  return (
    <div className="p-4 md:p-8">
      <header className='text-center mb-8'>
        <h1 className="text-3xl font-headline font-bold">创意者工作台</h1>
        <p className="text-muted-foreground mt-2">在这里, 您可以接受任务, 响应需求, 并利用AI工具将您的创意变为现实。</p>
      </header>
      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
          <TabsTrigger value="tasks">任务与需求</TabsTrigger>
          <TabsTrigger value="3d-creation">3D AI 创作</TabsTrigger>
          <TabsTrigger value="submissions">我的提交</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6"><TasksTab /></TabsContent>
        <TabsContent value="3d-creation" className="mt-6"><CreationForm /></TabsContent>
        <TabsContent value="submissions" className="mt-6"><SubmissionsTab /></TabsContent>
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
    const { role, isLoading } = useAuthStore();
    const router = useRouter();
    useEffect(() => { if (!isLoading && !role) { router.push('/login'); } }, [role, isLoading, router]);
    if(isLoading) { return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>; }
    if (role !== 'creator') { return <AppLayout><RestrictedAccess /></AppLayout>; }
    return <AppLayout><CreatorWorkbench /></AppLayout>;
}
