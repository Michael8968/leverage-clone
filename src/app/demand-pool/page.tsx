

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Demand, ProductService, Supplier } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { PlusCircle, Sparkles, BrainCircuit, Loader2, MessageSquare, Check, Search, Filter, Workflow } from 'lucide-react';
import { recommendCreatives } from '@/ai/flows/demand-matching';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { collection, doc, getDocs, updateDoc, addDoc, serverTimestamp, Timestamp } from '@/lib/cloudbase-compat';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ChatDialog } from '@/components/features/chat-dialog';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { getPrompts } from '@/ai/flows/admin-management-flows';
import { executePrompt } from '@/ai/flows/prompt-execution-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';



function RecommendationDialog({ open, onOpenChange, recommendations, demandTitle }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recommendations: Array<{ creativeId: string; reason: string }>;
    demandTitle: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2"><Sparkles className="text-accent"/> AI 推荐结果</DialogTitle>
                    <DialogDescription>
                        以下是AI为需求 “{demandTitle}” 匹配到的最合适的创意方。
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <Accordion type="single" collapsible className="w-full">
            {recommendations.map((rec: any, index: number) => (
              <AccordionItem value={`item-${index}`} key={rec.creativeId}>
                                <AccordionTrigger>{rec.creativeId}</AccordionTrigger>
                                <AccordionContent>{rec.reason}</AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const demandSchema = z.object({
  title: z.string().min(5, { message: "标题至少需要5个字符。" }),
  description: z.string().min(20, { message: "描述至少需要20个字符。" }),
  budget: z.preprocess(
    (val) => val ? parseFloat(String(val)) : undefined,
    z.number({ invalid_type_error: "预算必须是一个数字。" }).positive({ message: "预算必须为正数。" })
  ),
  category: z.string().min(1, { message: "请填写一个类别。" }),
});

function CreateDemandDialog({ open, onOpenChange, onDemandCreated }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDemandCreated: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuthStore();

    const form = useForm<z.infer<typeof demandSchema>>({
        resolver: zodResolver(demandSchema),
        defaultValues: {
            title: "",
            description: "",
            budget: 1000,
            category: "3D模型",
        },
    });

    const handleSubmit = async (values: z.infer<typeof demandSchema>) => {
        if (!user || !user.uid) {
            toast({ title: "错误", description: "无法获取用户信息，请重新登录再试。", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection('demands') as any, {
                ...values,
                requesterId: user.uid,
                requesterName: user.name,
                requesterAvatar: user.avatar,
                status: "开放中",
                createdAt: serverTimestamp(),
            });
            toast({ title: "成功", description: "您的需求已成功发布到需求池！" });
            onDemandCreated(); 
            onOpenChange(false); 
            form.reset();
        } catch (error) {
            console.error("Error creating demand:", error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            let friendlyMessage = '发布需求失败，请重试。';

            if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
              friendlyMessage = '权限不足：只有用户和管理员可以发布需求。';
            } else if (errorMessage.includes('validation') || errorMessage.includes('验证')) {
              friendlyMessage = '数据验证失败：请检查输入信息的格式和完整性。';
            } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
              friendlyMessage = '网络连接问题：请检查网络连接后重试。';
            } else if (errorMessage.includes('quota') || errorMessage.includes('配额')) {
              friendlyMessage = '发布配额不足：请稍后重试或联系技术支持。';
            }

            toast({ title: "发布失败", description: friendlyMessage, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle className="font-headline">发布新需求</DialogTitle>
                    <DialogDescription>
                        请详细描述您的需求，平台上的供应商和创意者将会看到。
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>需求标题</FormLabel><FormControl><Input placeholder="例如：为我的新产品设计一个科幻风格的包装" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>详细描述</FormLabel><FormControl><Textarea placeholder="请尽可能详细地描述您的需求，包括风格、用途、参考案例等..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="budget" render={({ field }) => (<FormItem><FormLabel>预算 (元)</FormLabel><FormControl><Input type="number" placeholder="1000" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>类别</FormLabel><FormControl><Input placeholder="例如：包装设计" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                                确认发布
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function DemandPoolPage() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Array<{ creativeId: string; reason: string }>>([]);
  const [isRecDialogOpen, setIsRecDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [availablePrompts, setAvailablePrompts] = useState<Array<{ id: string; name: string; content: string; category?: string }>>([]);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string | null>(null);
  const { role, user } = useAuthStore();
  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const demandsSnapshot = await getDocs(collection('demands') as any);
      const demandsList = demandsSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(data.createdAt),
        } as Demand;
      });
      setDemands(demandsList);
    } catch (error) {
      console.error("Error fetching demands:", error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      let friendlyMessage = '无法加载需求列表，请稍后重试。';

      if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
        friendlyMessage = '权限不足：无法访问需求数据，请联系管理员。';
      } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
        friendlyMessage = '网络连接问题：无法连接到服务器，请检查网络连接。';
      } else if (errorMessage.includes('not-found') || errorMessage.includes('未找到')) {
        friendlyMessage = '数据服务暂时不可用：需求池功能暂时无法使用。';
      } else if (errorMessage.includes('quota') || errorMessage.includes('配额')) {
        friendlyMessage = '服务配额不足：请稍后重试或联系技术支持。';
      }

      toast({
        title: '需求加载失败',
        description: friendlyMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchDialogData = useCallback(async () => {
    try {
        const promptsData = await getPrompts();
        setAvailablePrompts(promptsData.prompts.map((p: any) => ({
          id: p.promptKey,
          name: p.name,
          content: p.promptKey,
          category: p.ownerType
        })));
    } catch(error) {
        console.error("Error fetching dialog data:", error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        let friendlyMessage = '无法加载AI提示词配置，将使用默认匹配逻辑。';

        if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
          friendlyMessage = '权限不足：AI提示词功能需要管理员权限。';
        } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
          friendlyMessage = '网络连接问题：AI提示词加载失败，使用默认逻辑。';
        }

        toast({ title: '提示词加载失败', description: friendlyMessage, variant: 'destructive'});
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
    if(role === 'admin') {
      fetchDialogData();
    }
  }, [fetchAllData, fetchDialogData, role]);

  const handleRecommend = async () => {
    if (selectedRows.length === 0) {
      toast({ description: '请至少选择一个需求进行匹配。' });
      return;
    }
    
    setIsAiMatching(true);
    try {
      const [productsSnapshot, suppliersSnapshot] = await Promise.all([
  getDocs(collection('products') as any),
  getDocs(collection('suppliers') as any),
      ]);
  const allProducts = productsSnapshot.docs.map((doc: any) => doc.data() as ProductService);
  const allSuppliers = suppliersSnapshot.docs.map((doc: any) => doc.data() as Supplier);
  const creatives = [...allProducts, ...allSuppliers];
      const selectedDemand = demands.find(d => d.id === selectedRows[0])!;

      if(selectedPromptKey) {
        const result = await executePrompt({
            prompt: JSON.stringify({ demand: selectedDemand, creatives }),
            scenario: selectedPromptKey,
            userId: user?.uid || 'anonymous',
        });
        setRecommendations([{ creativeId: "AI分析结果", reason: result.output || 'No output' }]);
      } else {
        const result = await recommendCreatives({
            demandId: selectedDemand.id,
        });
        setRecommendations(result.creatives);
      }
      
      setIsRecDialogOpen(true);

    } catch (error) {
      console.error("AI recommendation failed:", error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      let friendlyMessage = 'AI匹配功能暂时不可用，请稍后重试。';

      if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
        friendlyMessage = '权限不足：AI匹配功能需要管理员权限。';
      } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
        friendlyMessage = '网络连接问题：无法连接到AI服务，请检查网络连接。';
      } else if (errorMessage.includes('quota') || errorMessage.includes('配额')) {
        friendlyMessage = 'AI服务配额不足：请稍后重试或联系技术支持。';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
        friendlyMessage = 'AI匹配超时：请简化需求描述后重试。';
      }

      toast({ title: 'AI匹配失败', description: friendlyMessage, variant: 'destructive' });
    } finally {
      setIsAiMatching(false);
    }
  };
  
  const handleCreateNewDemand = () => {
    setIsCreateDialogOpen(true);
  };
  
  const handleStartChat = (demand: Demand) => {
    setSelectedDemand(demand);
    setIsChatDialogOpen(true);
  };

  const handleAcceptDemand = async (demandId: string) => {
    if (!user) return;
    try {
  const demandRef = doc('demands', demandId) as any;
  await updateDoc(demandRef, {
            status: "进行中",
            creatorId: user.uid,
        });
        toast({ title: '抢单成功！', description: '您已成功接受该需求，可以开始沟通了。' });
        fetchAllData();
    } catch(error) {
        console.error("Error accepting demand:", error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        let friendlyMessage = '抢单操作失败，请重试。';

        if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
          friendlyMessage = '权限不足：只有供应商和创意者可以抢单。';
        } else if (errorMessage.includes('already-exists') || errorMessage.includes('已存在')) {
          friendlyMessage = '该需求已被其他供应商接受，请选择其他需求。';
        } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
          friendlyMessage = '网络连接问题：请检查网络连接后重试。';
        }

        toast({ title: '抢单失败', description: friendlyMessage, variant: 'destructive' });
    }
  };

  const isRowSelected = (id: string) => selectedRows.includes(id);

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [id] // Allow only one selection
    );
  };

  const getStatusBadge = (status: Demand['status']) => {
    switch (status) {
      case '开放中': return <Badge variant="secondary">{status}</Badge>;
      case '进行中': return <Badge className="bg-blue-500 text-white">{status}</Badge>;
      case '已完成': return <Badge className="bg-green-500 text-white">{status}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-headline font-bold">需求池</h1>
          <p className="text-muted-foreground">在这里，您可以发布、浏览和管理所有设计与采购需求。</p>
        </header>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <Input placeholder="搜索需求..." className="w-64" />
                    </div>
                    <Button variant="outline" disabled><Filter className="mr-2"/>筛选</Button>
                </div>
              <div className="flex items-center gap-2">
                {role === 'admin' && (
                    <div className='flex items-center gap-2'>
                        <Select 
                            onValueChange={(value) => setSelectedPromptKey(value === 'default' ? null : value)} 
                            value={selectedPromptKey || 'default'}
                        >
                            <SelectTrigger className="w-[180px]">
                                <div className="flex items-center gap-2">
                                <Workflow className="w-4 h-4 text-muted-foreground"/>
                                <SelectValue placeholder="默认推荐逻辑" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">-- 默认推荐逻辑 --</SelectItem>
                                {availablePrompts.map((p: any) => <SelectItem key={p.promptKey} value={p.promptKey}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleRecommend} disabled={isAiMatching || selectedRows.length === 0}>
                            {isAiMatching ? <Loader2 className="animate-spin mr-2" /> : <BrainCircuit className="mr-2" />}
                            AI 匹配
                        </Button>
                    </div>
                )}
                 { (role === 'user' || role === 'admin') && 
                    <Button onClick={handleCreateNewDemand}>
                        <PlusCircle className="mr-2" />
                        发布新需求
                    </Button>
                }
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                   {role === 'admin' && <TableHead className="w-[50px]"></TableHead> }
                  <TableHead>需求标题</TableHead>
                  <TableHead>发布人</TableHead>
                  <TableHead>预算</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>发布日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
          {isLoading ? Array.from({ length: 5 }).map((_: any, i: number) => (
                    <TableRow key={i}>
                        <TableCell colSpan={role === 'admin' ? 7 : 6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                )) : demands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={role === 'admin' ? 7 : 6} className="h-24 text-center">暂无需求。</TableCell>
                  </TableRow>
                ) : (
                  demands.map((demand: any) => (
                    <TableRow key={demand.id} data-state={isRowSelected(demand.id) ? 'selected' : ''}>
                      {role === 'admin' && <TableCell><Checkbox checked={isRowSelected(demand.id)} onCheckedChange={() => toggleRowSelection(demand.id)} /></TableCell> }
                      <TableCell className="font-medium">{demand.title}</TableCell>
                      <TableCell>
                          <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6"><AvatarImage src={demand.requesterAvatar} /><AvatarFallback>{demand.requesterName.charAt(0)}</AvatarFallback></Avatar>
                              <span>{demand.requesterName}</span>
                          </div>
                      </TableCell>
                      <TableCell>¥{demand.budget.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(demand.status)}</TableCell>
                      <TableCell>{demand.createdAt ? format(new Date(demand.createdAt), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                         {(demand.status === "进行中" && (demand.requesterId === user?.uid || demand.creatorId === user?.uid || role === 'admin')) && (
                             <Button variant="outline" size="sm" onClick={() => handleStartChat(demand)}>
                                <MessageSquare className="mr-2 h-4 w-4"/>沟通
                            </Button>
                         )}
                         {(demand.status === "开放中" && (role === 'creator' || role === 'supplier')) && (
                            <Button variant="default" size="sm" onClick={() => handleAcceptDemand(demand.id)}>
                                <Check className="mr-2 h-4 w-4"/>抢单
                            </Button>
                         )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <RecommendationDialog
        open={isRecDialogOpen}
        onOpenChange={setIsRecDialogOpen}
        recommendations={recommendations}
        demandTitle={demands.find(d => d.id === selectedRows[0])?.title || ''}
      />
      <CreateDemandDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onDemandCreated={fetchAllData}
      />
       {selectedDemand && user && (
            <ChatDialog
                open={isChatDialogOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setSelectedDemand(null);
                    setIsChatDialogOpen(isOpen);
                }}
                demand={selectedDemand}
                currentUser={user}
            />
        )}
    </AppLayout>
  );
}
