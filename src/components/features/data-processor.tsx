

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, BrainCircuit, Loader2, FileText, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { evaluateSellerData, type EvaluateSellerDataOutput } from '@/ai/flows/supplier-data-analysis';
import { useAuthStore } from '@/store/auth';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import type { Resource } from '@/lib/types';


const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export function DataProcessor({ className, destination = 'suppliers' }: { className?: string, destination?: 'suppliers' | 'products' | 'resources' }) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiResult, setAiResult] = useState<EvaluateSellerDataOutput['processedSuppliers'] | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setAiResult(null); // Reset results when file changes
    }
  };

  const processData = async () => {
    if (!file || !user) {
      toast({ title: '提示', description: '请先选择一个CSV文件并确保您已登录。' });
      return;
    }
    setIsLoading(true);
    setAiResult(null);
    try {
      const csvDataUri = await fileToDataUri(file);
      const result = await evaluateSellerData({ csvDataUri, supplierId: user.uid });
      setAiResult(result.processedSuppliers);
      toast({ title: '成功', description: 'AI分析完成，请检查结果并保存。' });
    } catch (error) {
      console.error("Data processing failed", error);
      toast({ title: '错误', description: '数据分析失败，请检查文件格式或稍后再试。', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async () => {
    if (!aiResult || !user) {
        toast({ title: '错误', description: '没有可保存的数据或用户信息丢失。', variant: 'destructive' });
        return;
    }
    setIsSaving(true);
    try {
        const batch = writeBatch(db);
        const targetCollection = collection(db, destination);
        
        aiResult.forEach(itemData => {
            const newDocRef = doc(targetCollection); // Create a new document with a unique ID
            
            let dataToSave: any = {
                ...itemData,
                processedBy: user.uid, 
                processedAt: serverTimestamp(),
            };

            // Add default fields for 'resources' collection if applicable
            if (destination === 'resources') {
                const resourceData = itemData as unknown as Partial<Resource>;
                 dataToSave = {
                    ...dataToSave,
                    sourceUrl: resourceData.sourceUrl || '',
                    tags: resourceData.tags || [],
                    updateFrequency: resourceData.updateFrequency || '每日',
                    status: '可用',
                };
            }

            batch.set(newDocRef, dataToSave);
        });

        await batch.commit();
        toast({ title: '保存成功', description: `AI分析结果已成功保存到 ${destination} 集合。` });
        setAiResult(null);
        setFile(null);
    } catch (error) {
        console.error(`Failed to save data to ${destination}:`, error);
        toast({ title: '保存失败', description: '无法将结果保存到数据库。', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="font-headline">批量数据处理</CardTitle>
        <CardDescription>上传结构化数据文件(如CSV)，AI将为您评估和整理，并将结果存入数据库。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
                 <Input type="file" accept=".csv,.json,.txt" onChange={handleFileChange} />
                 {file && <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3"/> {file.name}</p>}
            </div>
          <Button onClick={processData} disabled={isLoading || !file} className="w-32">
            {isLoading ? <Loader2 className="animate-spin" /> : <><BrainCircuit className="mr-2" /> 分析数据</>}
          </Button>
        </div>
        {aiResult && (
          <div className="space-y-4 pt-4">
            <CardTitle className="text-lg font-medium">AI 分析结果</CardTitle>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>类别</TableHead>
                        <TableHead>匹配度</TableHead>
                        <TableHead>AI建议</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {aiResult.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>
                                <Badge variant={item.matchScore > 75 ? 'default' : 'secondary'}>
                                    {item.matchScore}%
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{item.recommendation}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="flex justify-end">
                <Button onClick={saveData} disabled={isSaving} className="w-40">
                     {isSaving ? <Loader2 className="animate-spin" /> : <><CheckCircle className="mr-2" /> 保存到数据库</>}
                </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
