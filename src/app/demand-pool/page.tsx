
'use client';

import { useState, useEffect } from 'react';
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
import type { Demand, ProductService } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { PlusCircle, Sparkles, BrainCircuit, Loader2, MessageSquare, Check, Search, Filter } from 'lucide-react';
import { recommendCreatives } from '@/ai/flows/demand-matching';
import type { RecommendCreativesOutput } from '@/ai/flows/demand-matching';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export default function DemandPoolPage() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isRecDialogOpen, setIsRecDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const { role } = useAuthStore();
  const { toast } = useToast();

  const fetchDemands = async () => {
    setIsLoading(true);
    try {
      const demandsCollection = collection(db, 'demands');
      const demandSnapshot = await getDocs(demandsCollection);
      const demandsList = demandSnapshot.docs.map(doc => {
          const data = doc.data();
          return { 
              id: doc.id, 
              ...data,
              // Convert Firestore timestamp or string to Date object
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          } as Demand
      });
      setDemands(demandsList);
    } catch (error) {
      console.error("Error fetching demands from Firestore:", error);
      toast({
        title: '加载失败',
        description: '无法从数据库加载需求数据，请稍后重试。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClaimDemand = async (demandId: string) => {
    const originalDemands = [...demands];
    // Optimistic UI update
    setDemands(prevDemands =>
        prevDemands.map(d =>
            d.id === demandId ? { ...d, status: '进行中' } : d
        )
    );

    try {
        const demandRef = doc(db, "demands", demandId);
        await updateDoc(demandRef, {
            status: "进行中"
        });
        toast({
            title: "成功",
            description: "您已成功抢单，请尽快与需求方沟通。",
        });
    } catch (error) {
        // Revert UI on error
        setDemands(originalDemands);
        console.error("Error claiming demand:", error);
        toast({
            title: "操作失败",
            description: "抢单失败，请稍后重试。",
            variant: "destructive",
        });
    }
  };


  const isAllSelected = !isLoading && demands.length > 0 && selectedRows.length === demands.length;
  const isSomeSelected = selectedRows.length > 0 && selectedRows.length < demands.length;

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? demands.map(d => d.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows(prev =>
      checked ? [...prev, id] : prev.filter(rowId => rowId !== id)
    );
  };
  
  const handleRecommendClick = (demand: Demand) => {
    setSelectedDemand(demand);
    setIsRecDialogOpen(true);
  };
  
  const handleBatchRecommendClick = () => {
    setSelectedDemand(null);
    setIsRecDialogOpen(true);
  };

  const getStatusBadge = (status: Demand['status']) => {
    switch (status) {
      case '开放中':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">开放中</Badge>;
      case '进行中':
         return <Badge variant="secondary">进行中</Badge>;
      case '已完成':
        return <Badge variant="outline">已完成</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-headline font-bold">需求池</h1>
          <p className="text-muted-foreground">平台可用AI智能推送需求给供应商或创作者，供应商和创作者也可以在公共需求池中找需求，需求发布者决定与哪个供应商或创作者合作。</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">公开需求列表</CardTitle>
            <CardDescription>
              查看所有已发布的需求，寻找与您业务相关的机会。
            </CardDescription>
             <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="搜索需求标题或标签..." className="pl-8 w-64" />
                </div>
                <Button variant="outline" disabled>
                  <Filter className="mr-2 h-4 w-4" />
                  筛选
                </Button>
                 {role === 'admin' && selectedRows.length > 0 && (
                    <Button onClick={handleBatchRecommendClick} size="sm">
                        <Sparkles className="mr-2" />
                        为选中的 {selectedRows.length} 项批量推荐
                    </Button>
                )}
              </div>
              <Button disabled>
                <PlusCircle className="mr-2"/>
                发布新需求
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {role === 'admin' && (
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected || (isSomeSelected && 'indeterminate')}
                        onCheckedChange={handleSelectAll}
                        disabled={isLoading || demands.length === 0}
                      />
                    </TableHead>
                  )}
                  <TableHead>需求标题</TableHead>
                  <TableHead>预算</TableHead>
                  <TableHead>类别</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>发布日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {role === 'admin' && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : demands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={role === 'admin' ? 7 : 6} className="h-24 text-center">
                      暂无需求数据。
                    </TableCell>
                  </TableRow>
                ) : (
                  demands.map(demand => (
                    <TableRow key={demand.id}>
                      {role === 'admin' && (
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.includes(demand.id)}
                            onCheckedChange={(checked) => handleSelectRow(demand.id, !!checked)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{demand.title}</TableCell>
                      <TableCell>¥{demand.budget.toLocaleString()}</TableCell>
                      <TableCell>{demand.category}</TableCell>
                      <TableCell>
                        {getStatusBadge(demand.status)}
                      </TableCell>
                      <TableCell>{format(demand.createdAt, 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="text-right">
                        {role === 'admin' && (
                          <Button variant="ghost" size="sm" onClick={() => handleRecommendClick(demand)}>
                            <Sparkles className="mr-2 h-4 w-4" /> AI推荐
                          </Button>
                        )}
                        {(role === 'user' || role === 'creator') && demand.status === '开放中' ? (
                            <Button variant="default" size="sm" onClick={() => handleClaimDemand(demand.id)}>
                                抢单
                            </Button>
                        ) : (role === 'user' || role === 'creator') && demand.status === '进行中' ? (
                            <Button variant="outline" size="sm" disabled>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                开始沟通
                            </Button>
                        ) : demand.status === '已完成' ? (
                            <div className='flex items-center justify-end gap-2 text-muted-foreground'>
                               <Check className="h-4 w-4"/>
                               已完成
                            </div>
                        ) : (
                          role !== 'admin' && <div className='flex items-center justify-end h-9'>-</div>
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
        onOpenChange={(isOpen) => {
            if (!isOpen) {
                if (!selectedDemand && selectedRows.length > 0) {
                  setSelectedRows([]);
                }
                setSelectedDemand(null);
            }
            setIsRecDialogOpen(isOpen);
        }}
        demand={selectedDemand}
        selectedDemands={selectedRows.length > 0 && !selectedDemand ? demands.filter(d => selectedRows.includes(d.id)) : null}
      />
    </AppLayout>
  );
}

type BatchResult = {
    demand: Demand;
    recommendations: RecommendCreativesOutput | null;
    error?: string;
}

function RecommendationDialog({ open, onOpenChange, demand, selectedDemands }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demand: Demand | null;
  selectedDemands: Demand[] | null;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [aiResults, setAiResults] = useState<BatchResult[] | null>(null);
    const { toast } = useToast();
    const [creatives, setCreatives] = useState<ProductService[]>([]);
    const [creativesLoading, setCreativesLoading] = useState(true);

    useEffect(() => {
      const fetchCreatives = async () => {
        setCreativesLoading(true);
        try {
          // In a real app, "creatives" could be suppliers, creators, or specific products.
          // Here, we'll use products as a stand-in for "creatives".
          const productsCollection = collection(db, 'products');
          const productSnapshot = await getDocs(productsCollection);
          const productsList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductService));
          setCreatives(productsList);
        } catch (error) {
          console.error("Error fetching creatives:", error);
          toast({
            title: '加载创意方失败',
            description: '无法加载用于匹配的数据。',
            variant: 'destructive',
          });
        } finally {
          setCreativesLoading(false);
        }
      };

      if (open) {
        fetchCreatives();
        setAiResults(null);
      }
    }, [open, toast]);

    const handleAiRecommend = async () => {
        const demandsToProcess = demand ? [demand] : selectedDemands;
        if (!demandsToProcess || demandsToProcess.length === 0) return;
        
        setIsLoading(true);
        setAiResults(null);
        
        try {
            const results = await Promise.all(
              demandsToProcess.map(async (d): Promise<BatchResult> => {
                    try {
                        const result = await recommendCreatives({ demand: d, creatives });
                        return { demand: d, recommendations: result };
                    } catch (error) {
                        console.error(`AI recommendation failed for demand ${d.id}`, error);
                        return { demand: d, recommendations: null, error: 'AI推荐服务调用失败。' };
                    }
                })
            );
            setAiResults(results);
        } catch (error) {
            console.error("Batch AI recommendation failed", error);
            toast({ title: '错误', description: '批量AI推荐过程中发生意外错误。', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const targetDemands = demand ? [demand] : selectedDemands;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl flex items-center gap-2"><Sparkles className="text-accent"/> AI 创意匹配</DialogTitle>
                    <DialogDescription>
                        {demand ? `为需求“${demand.title}”匹配最合适的创意。` : `为 ${selectedDemands?.length} 个选中的需求进行批量匹配。`}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
                    {!aiResults && !isLoading && (
                        <div className="text-center space-y-4">
                            <p className="text-muted-foreground">准备好后，点击下方按钮启动AI分析和推荐。</p>
                            <Button variant="accent" onClick={handleAiRecommend} disabled={!targetDemands?.length || creativesLoading}>
                                {creativesLoading ? <Loader2 className="animate-spin mr-2"/> : <BrainCircuit className="mr-2"/>}
                                {creativesLoading ? '加载创意方...' : '启动AI推荐'}
                            </Button>
                        </div>
                    )}
                    {isLoading && (
                       <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Loader2 className="animate-spin" />
                                <span>AI正在分析需求并匹配创意... (处理 {targetDemands?.length} 项)</span>
                            </div>
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                       </div>
                    )}
                    {aiResults && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">推荐结果</h3>
                            <Accordion type="multiple" defaultValue={aiResults.map(r => r.demand.id)}>
                                {aiResults.map(result => (
                                    <AccordionItem value={result.demand.id} key={result.demand.id}>
                                        <AccordionTrigger>{result.demand.title}</AccordionTrigger>
                                        <AccordionContent>
                                            {result.error && <p className="text-destructive text-sm">{result.error}</p>}
                                            {result.recommendations && result.recommendations.recommendations.map(rec => {
                                                const creative = creatives.find(c => c.id === rec.creativeId);
                                                return (
                                                <Card key={rec.creativeId} className="mb-2">
                                                    <CardHeader className="p-4">
                                                        <CardTitle className="text-base">{creative?.name}</CardTitle>
                                                        <div className="flex gap-2 pt-1">
                                                           {creative?.category && <Badge variant="secondary">{creative.category}</Badge>}
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <p className="text-sm text-muted-foreground">{rec.reason}</p>
                                                    </CardContent>
                                                </Card>
                                            )})}
                                            {result.recommendations && result.recommendations.recommendations.length === 0 && (
                                                <p className="text-sm text-muted-foreground">未找到合适的匹配项。</p>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                             <Button variant="outline" className="w-full" onClick={() => setAiResults(null)}>重新匹配</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
