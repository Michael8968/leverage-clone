
'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { getProductRecommendations } from '@/ai/flows/shopping-assistant';
import { generateUserProfile, type UserProfile } from '@/ai/flows/user-profiling';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, X, Bot, User, BrainCircuit, Sparkles, Building, Loader2, FilePlus2, Gift, ExternalLink, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { ProductService } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


type Message = {
    id: number;
    type: 'user' | 'ai' | 'loading';
    text?: string;
    imageUrl?: string;
    profile?: UserProfile;
    recommendations?: ProductService[];
};

const formSchema = z.object({
  description: z.string().min(1, { message: '请输入您的需求描述。' }),
  image: z.instanceof(File).optional(),
  scenario: z.string().optional(),
});

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export function ShoppingAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { user, role } = useAuthStore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<ProductService[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      scenario: "birthday-gift",
    },
  });
  const imageRef = form.register("image");

  useEffect(() => {
    const fetchProducts = async () => {
        try {
            const productsCollection = collection(db, 'products');
            const productSnapshot = await getDocs(productsCollection);
            const productsList = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductService));
            setProducts(productsList);
        } catch (error) {
            console.error("Error fetching products:", error);
            toast({ title: "商品加载失败", description: "无法从数据库加载商品列表。", variant: "destructive" });
        }
    };
    fetchProducts();
  }, [toast]);


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

      const fullDescription = values.scenario === 'birthday-gift' 
        ? `场景：生日礼物。需求：${values.description}`
        : values.description;

      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        text: values.description,
        imageUrl: imagePreview ?? undefined,
      };
      const loadingMessage: Message = { id: Date.now() + 1, type: 'loading' };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      form.reset({ description: "", scenario: values.scenario });
      setImagePreview(null);
      
      try {
        const profile = await generateUserProfile({
            description: fullDescription,
            photoDataUri,
        });

        const productResult = await getProductRecommendations({
            userProfile: profile,
            products,
            photoDataUri,
        });
        
        const recommendedProducts = products.filter(p => productResult.recommendations.includes(p.id));

        const aiMessage: Message = {
          id: Date.now() + 2,
          type: 'ai',
          profile: profile,
          recommendations: recommendedProducts,
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
  
  const hasAiResponse = messages.some(m => m.type === 'ai');

  return (
    <div className="flex h-[calc(100vh-57px)] md:h-screen flex-col p-4 md:p-8">
        <div className='text-center mb-4'>
            <h1 className="text-2xl font-headline font-bold">欢迎光临“情动于艺”</h1>
            <p className="text-muted-foreground">与AI导购对话,发现为您量身推荐的独特设计,部分商品更支持个性化定制。</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
            <Card className="lg:col-span-2 flex flex-col">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Bot/> AI购物助手</CardTitle>
                    <CardDescription>您好,我是您的专属购物助手。请问您在寻找什么?比如,是为自己选购,还是为朋友挑选</CardDescription>
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
                        <div className="flex gap-2 items-end">
                            <FormField
                                control={form.control}
                                name="scenario"
                                render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger className="w-[130px]">
                                                <Gift className="w-4 h-4 mr-2" />
                                                <SelectValue placeholder="场景" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="birthday-gift">生日礼物</SelectItem>
                                                <SelectItem value="personal-use">为自己</SelectItem>
                                                <SelectItem value="other">其他</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                                />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                    <Textarea placeholder="例如: 我想找一个送给科幻迷的礼物..." {...field} rows={1} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="image"
                                render={() => (
                                <FormItem>
                                    <FormControl>
                                        <Button asChild variant="outline" size="icon">
                                            <label>
                                                <Paperclip />
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
                            <Button type="submit" disabled={isPending || products.length === 0} size="icon">
                                {isPending ? <Loader2 className="animate-spin" /> : <Send />}
                            </Button>
                        </div>
                        </form>
                    </Form>
                </CardFooter>
            </Card>
            <div className="flex flex-col gap-8">
              {role === 'creator' && <CreatorWorkbenchConnector />}
              <CustomServiceConnector />
              {role === 'user' && hasAiResponse && <DemandPoolConnector />}
            </div>
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

const AIMessage = ({ profile, recommendations }: Message) => {
  const router = useRouter();

  return (
    <div className="flex items-start gap-3">
        <Bot className="w-8 h-8 text-accent flex-shrink-0" />
        <div className="bg-card rounded-lg p-3 max-w-sm border space-y-4">
            <p>这是我为您找到的结果:</p>
            {profile && <UserProfileDisplay profile={profile} />}
            {recommendations && recommendations.length > 0 && <RecommendationsDisplay recommendations={recommendations} />}
            {recommendations && recommendations.length > 0 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                    <p>没有找到满意的结果？</p>
                    <Button variant="link" className="h-auto p-0" onClick={() => router.push('/demand-pool')}>发布到需求池</Button>
                </div>
            )}
        </div>
    </div>
  )
};

const UserProfileDisplay = ({ profile }: { profile: UserProfile }) => (
    <Card className="bg-background">
        <CardHeader className="p-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-accent"/>
                推荐理由
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
                     <Image src={`https://picsum.photos/seed/${rec.id}/300/200`} alt={rec.name} fill style={{objectFit: "cover"}} data-ai-hint="product design"/>
                   </div>
                   <div className="p-3">
                        <div className='flex justify-between items-start'>
                            <h5 className="font-semibold truncate pr-2">{rec.name}</h5>
                            <p className="font-bold text-right text-primary whitespace-nowrap">¥{rec.price.toLocaleString()}</p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">{rec.description}</p>
                   </div>
                   <CardFooter className="p-3 bg-muted/50 flex w-full justify-end gap-2">
                        <Button size="sm" variant="secondary" disabled>查看详情</Button>
                        <Button size="sm" onClick={() => rec.purchaseUrl && window.open(rec.purchaseUrl, '_blank')}>
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
                <Skeleton className="h-16 w-full" />
                <div className="space-y-2 pt-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        </div>
    </div>
);

const CreatorWorkbenchConnector = () => {
    const router = useRouter();
    return (
        <Card className="bg-primary/10 border-primary text-primary-foreground">
             <CardContent className="p-6 flex items-center justify-between">
                <p className='font-headline'>准备好开始创作了吗？</p>
                <Button variant="default" onClick={() => router.push('/creator-workbench')}>
                    进入创作者工作台 <ArrowRight className="ml-2"/>
                </Button>
            </CardContent>
        </Card>
    )
}

const CustomServiceConnector = () => {
    const router = useRouter();

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Building/> 高端定制服务</CardTitle>
                <CardDescription>
                    将您的构想变为现实，我们的签约合作方将为您提供专属设计服务，与专业3D艺术家沟通。
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
        <Card className="bg-accent/20 border-accent">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><FilePlus2/> 没找到满意的？</CardTitle>
                <CardDescription>您可以将您的需求发布到需求池，让更多的供应商和创意者来帮助您。</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" variant="accent" onClick={() => router.push('/demand-pool')}>
                    发布到需求池
                </Button>
            </CardContent>
        </Card>
    );
}

    