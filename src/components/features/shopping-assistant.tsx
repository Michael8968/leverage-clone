'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { getProductRecommendations } from '@/ai/flows/shopping-assistant';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, X, Bot, User, BrainCircuit, Sparkles, Building, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type Message = {
    id: number;
    type: 'user' | 'ai' | 'loading';
    text?: string;
    imageUrl?: string;
    profile?: string;
    recommendations?: string[];
};

const formSchema = z.object({
  description: z.string().min(1, { message: '请输入您的需求描述。' }),
  image: z.instanceof(File).optional(),
});

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function ShoppingAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { description: '', image: undefined },
  });
  const imageRef = form.register('image');

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      let photoDataUri: string | undefined = undefined;
      if (values.image) {
        photoDataUri = await fileToDataUri(values.image);
      }

      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        text: values.description,
        imageUrl: imagePreview ?? undefined,
      };
      const loadingMessage: Message = { id: Date.now() + 1, type: 'loading' };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      form.reset();
      setImagePreview(null);
      
      try {
        const userProfile = `用户角色: ${user?.role}, 用户名: ${user?.name}`;
        const result = await getProductRecommendations({
          description: values.description,
          photoDataUri,
          userProfile,
        });

        const aiMessage: Message = {
          id: Date.now() + 2,
          type: 'ai',
          profile: `基于您的输入, AI分析出您的用户画像偏向: 热爱科技、追求生活品质的都市年轻群体。`,
          recommendations: result.recommendations,
        };

        setMessages((prev) => prev.map((msg) => (msg.type === 'loading' ? aiMessage : msg)));
      } catch (error) {
        console.error('AI call failed:', error);
        toast({
          title: '错误',
          description: 'AI服务调用失败，请稍后再试。',
          variant: 'destructive',
        });
        setMessages((prev) => prev.filter((msg) => msg.type !== 'loading'));
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-57px)] md:h-screen flex-col p-4 md:p-8">
        <h1 className="text-2xl font-headline font-bold mb-4">AI 购物助手</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
            <Card className="lg:col-span-2 flex flex-col">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Bot/> 智能对话</CardTitle>
                    <CardDescription>输入您的想法或上传一张图片，让AI为您推荐心仪的商品。</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-full" ref={scrollAreaRef}>
                        <div className="space-y-6 pr-4">
                            {messages.map((msg) => {
                                if (msg.type === 'user') return <UserMessage key={msg.id} {...msg} />;
                                if (msg.type === 'ai') return <AIMessage key={msg.id} {...msg} />;
                                if (msg.type === 'loading') return <LoadingMessage key={msg.id} />;
                                return null;
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2">
                        {imagePreview && (
                            <div className="relative w-24 h-24">
                                <Image src={imagePreview} alt="Preview" layout="fill" objectFit="cover" className="rounded-md" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-0 right-0 h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
                                    onClick={() => {
                                    setImagePreview(null);
                                    form.setValue('image', undefined);
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                <Textarea placeholder="例如：我想要一个适合在办公室使用的降噪耳机..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <div className="flex justify-between items-center">
                            <FormField
                                control={form.control}
                                name="image"
                                render={() => (
                                <FormItem>
                                    <FormControl>
                                    <Button asChild variant="outline">
                                        <label>
                                        <Paperclip className="mr-2" /> 上传图片
                                        <Input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            {...imageRef}
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    const file = e.target.files[0];
                                                    form.setValue('image', file);
                                                    setImagePreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                        </label>
                                    </Button>
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                                发送
                            </Button>
                        </div>
                        </form>
                    </Form>
                </CardFooter>
            </Card>
            <CustomServiceConnector />
        </div>
    </div>
  );
}

const UserMessage = ({ text, imageUrl }: Message) => (
  <div className="flex items-start gap-3 justify-end">
    <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-sm">
      <p>{text}</p>
      {imageUrl && <Image src={imageUrl} alt="User upload" width={200} height={200} className="mt-2 rounded-md" />}
    </div>
    <User className="w-8 h-8 text-muted-foreground" />
  </div>
);

const AIMessage = ({ profile, recommendations }: Message) => (
  <div className="flex items-start gap-3">
    <Bot className="w-8 h-8 text-accent flex-shrink-0" />
    <div className="bg-card rounded-lg p-3 max-w-sm border">
      {profile && <UserProfileDisplay profile={profile} />}
      {recommendations && <RecommendationsDisplay recommendations={recommendations} />}
    </div>
  </div>
);

const UserProfileDisplay = ({ profile }: { profile: string }) => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-2 mb-2">
        <BrainCircuit className="w-5 h-5" />
        <p>{profile}</p>
    </div>
);

const RecommendationsDisplay = ({ recommendations }: { recommendations: string[] }) => (
    <div>
        <h4 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> 为您推荐:</h4>
        <ul className="space-y-2">
            {recommendations.map((rec, i) => (
                <li key={i} className="text-sm p-2 bg-background rounded-md">{rec}</li>
            ))}
        </ul>
    </div>
);

const LoadingMessage = () => (
    <div className="flex items-start gap-3">
        <Bot className="w-8 h-8 text-accent" />
        <div className="bg-card rounded-lg p-3 max-w-sm border w-full">
            <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2 pt-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        </div>
    </div>
);

const CustomServiceConnector = () => {
    const [step, setStep] = useState<'initial' | 'input' | 'loading' | 'results'>('initial');

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Building/> 高端定制</CardTitle>
                <CardDescription>连接供应商，满足您的专属批量采购需求。</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
                {step === 'initial' && (
                    <div className="text-center">
                        <p className="mb-4 text-muted-foreground">有更复杂的需求？</p>
                        <Button variant="accent" onClick={() => setStep('input')}>
                            启动批量需求匹配
                        </Button>
                    </div>
                )}
                {step === 'input' && (
                    <div className="w-full space-y-4">
                         <Textarea placeholder="请详细描述您的批量采购需求，如产品规格、数量、预算等..." rows={5}/>
                         <Button className="w-full" onClick={() => {
                            setStep('loading');
                            setTimeout(() => setStep('results'), 2000);
                         }}>寻找供应商</Button>
                    </div>
                )}
                 {step === 'loading' && (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        <p className="text-muted-foreground">正在为您匹配最佳供应商...</p>
                    </div>
                )}
                {step === 'results' && (
                    <div className="text-center w-full">
                        <h3 className="font-semibold mb-2">为您匹配到 3 家供应商</h3>
                        <div className="space-y-2 text-left">
                            <Badge variant="secondary">供应商A - 98%匹配度</Badge>
                            <Badge variant="secondary">供应商B - 95%匹配度</Badge>
                            <Badge variant="secondary">供应商C - 92%匹配度</Badge>
                        </div>
                        <Button variant="link" onClick={() => setStep('initial')}>重新匹配</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
