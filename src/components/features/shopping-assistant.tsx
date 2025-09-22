'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Bot, Loader2, Send, Sparkles, Building, FilePlus2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  description: z.string().min(1, { message: '请输入您的需求描述。' }),
});

export function ShoppingAssistant() {
  const { toast } = useToast();
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const query = values.description.trim();
    if (!query) {
      toast({
        title: "请输入搜索内容",
        description: "您需要输入一些需求描述才能进行搜索。",
      });
      return;
    }

    setIsNavigating(true);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col p-4 md:p-8">
        <div className='text-center mb-8'>
            <h1 className="text-3xl md:text-4xl font-headline font-bold">AI 驱动的智能采购平台</h1>
            <p className="text-muted-foreground mt-2 md:text-lg">开启您的智能购物之旅。只需输入您的想法，剩下的交给我们。</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
            <Card className="lg:col-span-2 flex flex-col shadow-xl">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Bot/> AI购物助手</CardTitle>
                    <CardDescription>您好！我是您的专属购物助手。请问您在寻找什么？</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
                    <Sparkles className="mx-auto h-16 w-16 text-accent mb-4" />
                    <p className="text-lg font-semibold">告诉我您的任何需求</p>
                    <p className="text-muted-foreground max-w-sm">
                        例如：“为我的新家寻找一个未来感的台灯”，或者“送给科幻迷男友的生日礼物”，然后点击发送，即可开启智能搜索。
                    </p>
                </CardContent>
                <CardFooter>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2">
                            <div className="flex gap-2 items-start">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                        <Textarea placeholder="输入您的需求..." {...field} rows={2} className="text-base"/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={isNavigating} size="lg" className="h-full">
                                    {isNavigating ? <Loader2 className="animate-spin" /> : <Send />}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardFooter>
            </Card>
            <div className="flex flex-col gap-8">
              <CustomServiceConnector />
              <DemandPoolConnector />
            </div>
        </div>
    </div>
  );
}

const CustomServiceConnector = () => {
    const router = useRouter();
    return (
        <Card className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Building/> 高端定制服务</CardTitle>
                <CardDescription>
                    将您的构想变为现实，与专业3D艺术家沟通，获得专属设计服务。
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center min-h-[100px]">
                <Button variant="accent" onClick={() => router.push('/designers')}>
                    预约设计师(付费) →
                </Button>
            </CardContent>
        </Card>
    );
};

const DemandPoolConnector = () => {
    const router = useRouter();
    return (
        <Card className="bg-accent/10 border-accent hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><FilePlus2/> 没找到满意的？</CardTitle>
                <CardDescription>您可以将您的需求发布到需求池，让更多的供应商和创意者来帮助您。</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" variant="secondary" onClick={() => router.push('/demand-pool')}>
                    发布需求
                </Button>
            </CardContent>
        </Card>
    );
}
