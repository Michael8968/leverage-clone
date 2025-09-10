
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon } from 'lucide-react';

export default function SearchPage() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl text-center">
            <h1 className="text-3xl font-headline font-bold">智能搜索</h1>
            <p className="text-muted-foreground mt-2">
                在我们的知识库中搜索，随时为您补充信息。
            </p>
        </div>
        <Card className="w-full max-w-2xl mt-8">
            <CardContent className="p-6">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input placeholder="搜索产品、服务、供应商..." className="pl-10" />
                    </div>
                    <Button>搜索</Button>
                </div>
            </CardContent>
        </Card>
        <Card className="w-full max-w-2xl mt-4 min-h-[200px]">
            <CardHeader>
                <CardTitle className="font-headline text-xl">搜索结果</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground">
                    <p>您的搜索结果将显示在此处。</p>
                    <p className="text-sm mt-2">请在上面的搜索框中输入内容开始搜索。</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
