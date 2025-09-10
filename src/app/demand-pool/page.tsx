'use client';

import { useState } from 'react';
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
import { mockDemands, mockCreatives } from '@/lib/data';
import type { Demand } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { PlusCircle, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';
import { recommendCreatives } from '@/ai/flows/demand-matching';
import type { RecommendCreativesOutput } from '@/ai/flows/demand-matching';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function DemandPoolPage() {
  const [demands] = useState<Demand[]>(mockDemands);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isRecDialogOpen, setIsRecDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const { role } = useAuthStore();
  const isAllSelected = selectedRows.length > 0 && selectedRows.length === demands.length;
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

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-headline font-bold">需求池</h1>
          <Button>
            <PlusCircle className="mr-2" />
            发布新需求
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">需求列表</CardTitle>
            <CardDescription>
              浏览、管理和匹配平台上的所有需求。
              {role === 'admin' && ' 您可以为选中的需求启动AI匹配。'}
            </CardDescription>
            {role === 'admin' && selectedRows.length > 0 && (
                 <Button onClick={handleBatchRecommendClick} size="sm" className="w-fit">
                    <Sparkles className="mr-2" />
                    为选中的 {selectedRows.length} 项批量推荐
                </Button>
            )}
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
                      />
                    </TableHead>
                  )}
                  <TableHead>标题</TableHead>
                  <TableHead>类别</TableHead>
                  <TableHead>预算 (元)</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建日期</TableHead>
                  {role === 'admin' && <TableHead className="text-right">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {demands.map(demand => (
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
                    <TableCell>{demand.category}</TableCell>
                    <TableCell>{demand.budget.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={demand.status === '开放中' ? 'default' : 'secondary'}>
                        {demand.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{demand.createdAt}</TableCell>
                    {role === 'admin' && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleRecommendClick(demand)}>
                          <Sparkles className="mr-2 h-4 w-4" />
                          AI推荐
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <RecommendationDialog
        open={isRecDialogOpen}
        onOpenChange={setIsRecDialogOpen}
        demand={selectedDemand}
        selectedDemands={selectedRows.length > 0 && !selectedDemand ? mockDemands.filter(d => selectedRows.includes(d.id)) : null}
      />
    </AppLayout>
  );
}

function RecommendationDialog({ open, onOpenChange, demand, selectedDemands }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demand: Demand | null;
  selectedDemands: Demand[] | null;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [aiResults, setAiResults] = useState<RecommendCreativesOutput | null>(null);
    const { toast } = useToast();

    const handleAiRecommend = async () => {
        if (!demand) return; // For now, batch recommend is a mock
        setIsLoading(true);
        setAiResults(null);
        try {
            const result = await recommendCreatives({ demand, creatives: mockCreatives.map(c => ({...c, id: c.id.toString()})) });
            setAiResults(result);
        } catch (error) {
            console.error("AI recommendation failed", error);
            toast({ title: '错误', description: 'AI推荐服务调用失败。', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const targetDemand = demand || (selectedDemands && selectedDemands[0]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle className="font-headline text-xl flex items-center gap-2"><Sparkles className="text-accent"/> AI 创意匹配</DialogTitle>
                    <DialogDescription>
                        {demand ? `为需求“${demand.title}”匹配最合适的创意。` : `为 ${selectedDemands?.length} 个选中的需求进行批量匹配。`}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {!aiResults && !isLoading && (
                        <div className="text-center space-y-4">
                            <p className="text-muted-foreground">准备好后，点击下方按钮启动AI分析和推荐。</p>
                            <Button variant="accent" onClick={handleAiRecommend} disabled={!targetDemand}>
                                <BrainCircuit className="mr-2"/>
                                启动AI推荐
                            </Button>
                        </div>
                    )}
                    {isLoading && (
                       <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Loader2 className="animate-spin" />
                                <span>AI正在分析需求并匹配创意...</span>
                            </div>
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                       </div>
                    )}
                    {aiResults && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">推荐结果</h3>
                            {aiResults.recommendations.map(rec => {
                                const creative = mockCreatives.find(c => c.id === rec.creativeId);
                                return (
                                <Card key={rec.creativeId}>
                                    <CardHeader>
                                        <CardTitle className="text-base">{creative?.name}</CardTitle>
                                        <div className="flex gap-2 pt-1">
                                            {creative?.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{rec.reason}</p>
                                    </CardContent>
                                </Card>
                            )})}
                             <Button variant="outline" className="w-full" onClick={() => setAiResults(null)}>重新匹配</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
