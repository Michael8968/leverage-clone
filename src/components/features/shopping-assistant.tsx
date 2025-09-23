
'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, X, Bot, User, BrainCircuit, Sparkles, Building, Loader2, FilePlus2, ExternalLink, Workflow } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Database and AI Flow Imports
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { ProductService, Supplier } from '@/lib/types';
import { getProductRecommendations, GetProductRecommendationsOutput } from '@/ai/flows/shopping-assistant';
import { UserProfile } from '@/ai/flows/user-profiling';
import { useAuthStore } from '@/store/auth';
import { getPrompts } from '@/ai/flows/admin-management-flows';
import { executePrompt } from '@/ai/flows/prompt-execution-flow';


type SimplePrompt = {
    name: string;
    promptKey: string;
};

// Type definitions for chat messages
type Message = {
    id: number;
    type: 'user' | 'ai' | 'loading';
    text?: string;
    imageUrl?: string;
    profile?: UserProfile;
    recommendations?: ProductService[];
    isRawText?: boolean;
};

// Form schema for user input
const formSchema = z.object({
  description: z.string().min(1, { message: '请输入您的需求描述。' }),
  image: z.instanceof(File).optional(),
  promptKey: z.string().optional(),
});

// Helper to convert File to Data URI
const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// =================================================================
// Main Shopping Assistant Component
// =================================================================
export function ShoppingAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [prompts, setPrompts] = useState<SimplePrompt[]>([]);
  const [isAiSearching, startAiSearch] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { role } = useAuthStore();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { description: "" },
  });
  const imageRef = form.register("image");

  // Pre-load products, suppliers, and prompts on component mount
  useEffect(() => {
    const fetchData = async () => {
        try {
            const [productsSnapshot, suppliersSnapshot, promptsData] = await Promise.all([
                getDocs(collection(db, 'products')),
                getDocs(collection(db, 'suppliers')),
                getPrompts(),
            ]);

            const productsList = productsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductService));
            setProducts(productsList);

            const suppliersList = suppliersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Supplier));
            setSuppliers(suppliersList);
            
            setPrompts(promptsData.prompts);

        } catch (error) {
            toast({ title: "数据加载失败", description: "无法加载产品目录或提示词，请稍后重试。", variant: "destructive" });
        }
    };
    fetchData();
  }, [toast]);

  // Auto-scroll to the latest message
  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Handle form submission to trigger the AI flow
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startAiSearch(async () => {
      const userMessage: Message = { id: Date.now(), type: 'user', text: values.description, imageUrl: imagePreview ?? undefined };
      const loadingMessage: Message = { id: Date.now() + 1, type: 'loading' };
      setMessages(prev => [...prev, userMessage, loadingMessage]);
      form.reset({ description: "", promptKey: values.promptKey }); // Keep promptKey
      setImagePreview(null);
      
      try {
        let aiMessage: Message;

        if (values.promptKey) {
            // Manual prompt execution path
            const result = await executePrompt({
                promptKey: values.promptKey,
                messages: [{ role: 'user', content: values.description }]
            });
            aiMessage = {
                id: Date.now() + 2,
                type: 'ai',
                text: result.text,
                isRawText: true,
            };

        } else {
            // Default recommendation path
            let photoDataUri: string | undefined = undefined;
            if (values.image) {
                photoDataUri = await fileToDataUri(values.image);
            }
            const result: GetProductRecommendationsOutput = await getProductRecommendations({
                description: values.description,
                photoDataUri,
                products,
                suppliers,
            });

            const recommendedProducts = products.filter(p => result.recommendations.includes(p.id));

            aiMessage = { 
                id: Date.now() + 2, 
                type: 'ai', 
                profile: result.userProfile,
                recommendations: recommendedProducts,
                isRawText: false,
            };
        }
        
        setMessages(prev => prev.map(msg => (msg.type === 'loading' ? aiMessage : msg)));

      } catch (error) {
        toast({ title: 'AI 分析失败', description: '调用AI服务时发生错误，请稍后再试。', variant: 'destructive' });
        setMessages(prev => prev.filter(msg => msg.type !== 'loading'));
      }
    });
  };
  
  const hasAiResponse = messages.some(m => m.type === 'ai');

  return (
    <div className="flex h-[calc(100vh-57px)] md:h-screen flex-col p-4 md:p-8">
        <div className='text-center mb-4'>
            <h1 className="text-2xl font-headline font-bold">欢迎光临 Leverage 力维利治</h1>
            <p className="text-muted-foreground">与AI导购对话,发现为您量身推荐的独特设计,部分商品更支持个性化定制。</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
            <Card className="lg:col-span-2 flex flex-col">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Bot/> AI购物助手</CardTitle>
                    <CardDescription>您好,我是您的专属购物助手。请问您在寻找什么?</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-full" ref={scrollAreaRef}>
                        <div className="space-y-6 pr-4">
                            {messages.length === 0 && (
                                <div className="text-center text-muted-foreground pt-16">
                                    <Sparkles className="mx-auto h-12 w-12 text-accent mb-4" />
                                    <p>告诉我您的需求，比如“一个未来感的台灯”，我来帮您寻找。 </p>
                                </div>
                            )}
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
                                <Image src={imagePreview} alt="Preview" width={100} height={100} style={{objectFit: "cover"}} className="rounded-md" />
                                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={() => { setImagePreview(null); form.setValue('image', undefined); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <FormField control={form.control} name="promptKey" render={({ field }) => (
                            <FormItem>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-9 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Workflow className="w-4 h-4 text-muted-foreground"/>
                                                <SelectValue placeholder="使用默认推荐逻辑" />
                                            </div>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="">-- 使用默认推荐逻辑 --</SelectItem>
                                        {prompts.map(p => (
                                            <SelectItem key={p.promptKey} value={p.promptKey}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                        <div className="flex gap-2 items-end">
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                    <Textarea placeholder="例如: 我想找一个送给科幻迷的礼物..." {...field} rows={1} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="image" render={() => (
                                <FormItem>
                                    <FormControl>
                                        <Button asChild variant="outline" size="icon">
                                            <label>
                                                <Paperclip />
                                                <Input type="file" className="hidden" accept="image/*" {...imageRef}
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
                            )}/>
                            <Button type="submit" disabled={isAiSearching || products.length === 0} size="icon">
                                {isAiSearching ? <Loader2 className="animate-spin" /> : <Send />}
                            </Button>
                        </div>
                        </form>
                    </Form>
                </CardFooter>
            </Card>
            <div className="flex flex-col gap-8">
              {role === 'user' && hasAiResponse && <DemandPoolConnector />}
              <CustomServiceConnector />
            </div>
        </div>
    </div>
  );
}

// =================================================================
// Sub-components for displaying messages
// =================================================================
const UserMessage = ({ text, imageUrl }: Message) => (
  <div className="flex items-start gap-3 justify-end">
    <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-sm">
      <p>{text}</p>
      {imageUrl && <Image src={imageUrl} alt="User upload" width={200} height={200} className="mt-2 rounded-md" />}
    </div>
    <User className="w-8 h-8 text-muted-foreground" />
  </div>
);

const AIMessage = ({ profile, recommendations, text, isRawText }: Message) => (
    <div className="flex items-start gap-3">
        <Bot className="w-8 h-8 text-accent flex-shrink-0" />
        <div className="bg-card rounded-lg p-3 border space-y-4 w-full">
            {isRawText ? (
                <p className="text-sm whitespace-pre-wrap">{text}</p>
            ) : (
                <>
                    <p className='font-semibold'>这是我根据您的需求分析的结果：</p>
                    {profile && <UserProfileDisplay profile={profile} />}
                    {recommendations && recommendations.length > 0 && <RecommendationsDisplay recommendations={recommendations} />}
                    {(!recommendations || recommendations.length === 0) && <p className="text-sm text-muted-foreground">抱歉，暂时没有找到完全匹配的商品。</p>}
                </>
            )}
        </div>
    </div>
);

const UserProfileDisplay = ({ profile }: { profile: UserProfile }) => (
    <Card className="bg-background">
        <CardHeader className="p-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-accent"/> 用户画像分析
            </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
            <p className="text-sm text-muted-foreground mb-2">{profile.summary}</p>
            <div className="flex flex-wrap gap-1">
                {profile.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
        </CardContent>
    </Card>
);

const RecommendationsDisplay = ({ recommendations }: { recommendations: ProductService[] }) => (
    <div>
        <h4 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> 首要推荐</h4>
        <div className="space-y-3">
            {recommendations.map((rec) => (
                <Card key={rec.id} className="overflow-hidden">
                   <div className="aspect-video relative w-full">
                     <Image src={rec.imageUrl || `https://picsum.photos/seed/${rec.id}/300/200`} alt={rec.name} fill style={{objectFit: "cover"}}/>
                   </div>
                   <div className="p-3">
                        <div className='flex justify-between items-start gap-2'>
                           <div>
                            <h5 className="font-semibold truncate pr-2">{rec.name}</h5>
                             {rec.supplierName && <p className="text-xs text-muted-foreground">由 {rec.supplierName} 提供</p>}
                           </div>
                            <p className="font-bold text-right text-primary whitespace-nowrap">¥{rec.price.toLocaleString()}</p>
                        </div>
                   </div>
                   <CardFooter className="p-3 bg-muted/50 flex w-full justify-end gap-2">
                        <Button size="sm" variant="secondary" disabled>查看详情</Button>
                        <Button size="sm" onClick={() => rec.purchaseUrl && window.open(rec.purchaseUrl, '_blank')} disabled={!rec.purchaseUrl}>
                            立即购买 <ExternalLink className="ml-1.5"/>
                        </Button>
                   </CardFooter>
                </Card>
            ))}
        </div>
    </div>
);

const LoadingMessage = () => (
    <div className="flex items-start gap-3">
        <Bot className="w-8 h-8 text-accent" />
        <div className="bg-card rounded-lg p-3 max-w-sm border w-full">
            <div className="space-y-3">
                <p className='text-sm font-semibold text-muted-foreground'>AI 正在分析您的需求，请稍候...</p>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    </div>
);


const CustomServiceConnector = () => {
    const router = useRouter();
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Building/> 高端定制服务</CardTitle>
                <CardDescription>将您的构想变为现实，寻找能为您提供专属设计服务的供应商。</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" variant="accent" onClick={() => router.push('/suppliers')}>
                    寻找供应商 →
                </Button>
            </CardContent>
        </Card>
    );
};

const DemandPoolConnector = () => {
    const router = useRouter();
    return (
        <Card className="bg-accent/10 border-accent">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><FilePlus2/> 没找到满意的？</CardTitle>
                <CardDescription>您可以将您的需求发布到需求池，让更多的供应商和创意者来帮助您。</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" onClick={() => router.push('/demand-pool')}>
                    发布到需求池
                </Button>
            </CardContent>
        </Card>
    );
}
