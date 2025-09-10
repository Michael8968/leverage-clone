
import type { Demand } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight } from 'lucide-react';

interface DemandListProps {
  demands: Demand[];
  isLoading: boolean;
  onDemandSelect?: (demand: Demand) => void;
}

export function DemandList({ demands, isLoading, onDemandSelect }: DemandListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (demands.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        暂无开放的需求。
      </div>
    );
  }
  
  return (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>类别</TableHead>
                <TableHead>预算 (元)</TableHead>
                <TableHead className="text-right">操作</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {demands.map(demand => (
                <TableRow key={demand.id}>
                    <TableCell className="font-medium">{demand.title}</TableCell>
                    <TableCell><Badge variant="outline">{demand.category}</Badge></TableCell>
                    <TableCell>{demand.budget.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => onDemandSelect?.(demand)}>
                            接受任务 <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
  );
}
