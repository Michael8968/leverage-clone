'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, BrainCircuit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { evaluateSellerData } from '@/ai/flows/supplier-data-analysis';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export function DataProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const processData = async () => {
    if (!file) {
      toast({ title: '提示', description: '请先选择一个CSV文件。' });
      return;
    }
    setIsLoading(true);
    setAiResult(null);
    try {
      const csvDataUri = await fileToDataUri(file);
      const result = await evaluateSellerData({ csvDataUri });
      setAiResult(result.insights);
    } catch (error) {
      console.error("Data processing failed", error);
      toast({ title: '错误', description: '数据分析失败，请检查文件格式或稍后再试。', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">批量数据处理</CardTitle>
        <CardDescription>上传供应商数据(CSV)，AI将为您提供销售策略洞察。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input type="file" accept=".csv" onChange={handleFileChange} />
          <Button onClick={processData} disabled={isLoading || !file}>
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
            处理数据
          </Button>
        </div>
        {aiResult && (
          <Alert>
            <BrainCircuit className="h-4 w-4" />
            <AlertTitle>AI 分析洞察</AlertTitle>
            <AlertDescription>
              <pre className="whitespace-pre-wrap font-body text-sm">{aiResult}</pre>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
