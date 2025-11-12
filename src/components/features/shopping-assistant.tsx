

'use client';

import React, { useState, useRef, useEffect, useTransition, useMemo } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, X, Bot, User, BrainCircuit, Sparkles, Building, Loader2, FilePlus2, ExternalLink, Workflow, Puzzle, Users, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, getDocs } from '@/lib/cloudbase-compat';
import type { ProductService, Supplier, UserProfile, MediaAsset, AIScenario, Appointment, User as AppUser } from '@/lib/types';
import { getProductRecommendations } from '@/ai/flows/shopping-assistant';
import { useAuthStore } from '@/store/auth';
import { executePrompt } from '@/ai/flows/prompt-execution-flow';
import { getUploadUrlForMediaAsset, analyzeMediaAsset } from '@/ai/flows/multimodal-flows';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { differenceInHours, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTheme } from '@/hooks/useTheme';
import { getVideoSrcForTheme } from '@/lib/video-urls';

// Type definitions for chat messages
type Message = {
    id: number;
    type: 'user' | 'ai' | 'loading';
    text?: string;
    imageUrl?: string;
    mediaPreviewUrl?: string;
    mediaType?: string;
    profile?: UserProfile;
    recommendations?: ProductService[];
    isRawText?: boolean;
};

// Form schema for user input
const formSchema = z.object({
  description: z.string().min(1, { message: '请输入您的需求描述。' }),
  image: z.instanceof(File).optional(),
  scenarioId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;


// New component for the dynamic video background
function DynamicVideoBackground() {
  const { theme } = useTheme();
    const [canPlay, setCanPlay] = useState<boolean>(false);
    const [videoError, setVideoError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // 使用 useMemo 计算视频源,避免在 effect 中同步 setState
        const videoSrc = useMemo(() => {
        return getVideoSrcForTheme(theme);
        }, [theme]);

    // Probe whether the video can be loaded/playback to avoid showing broken media in production
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let mounted = true;
        try {
            const v = document.createElement('video');
            v.preload = 'metadata';
            v.muted = true;
            v.playsInline = true;
            v.src = videoSrc;
            const onLoaded = () => {
                if (!mounted) return;
                console.log('Video probe successful:', { src: videoSrc, duration: v.duration });
                setCanPlay(true);
                setVideoError(null);
                cleanup();
            };
            const onError = (e: Event) => {
                if (!mounted) return;
                const error = (e.target as HTMLVideoElement).error;
                const errorDetails = {
                  code: error?.code,
                  message: error?.message,
                  src: videoSrc,
                  networkState: (e.target as HTMLVideoElement).networkState,
                  readyState: (e.target as HTMLVideoElement).readyState
                };
                console.error('Video probe failed:', errorDetails);
                setCanPlay(false);
                setVideoError(`Video load failed: ${error?.message || 'Unknown error'}`);
                cleanup();
            };
            function cleanup() {
                v.removeEventListener('loadeddata', onLoaded);
                v.removeEventListener('error', onError);
            }
            v.addEventListener('loadeddata', onLoaded);
            v.addEventListener('error', onError);
            // kick off load
            // some environments won't actually download until appended, but this works in most browsers
            v.load();
            return () => { mounted = false; cleanup(); };
        } catch (e) {
            console.error('Video probe setup failed:', e);
            if (mounted) setTimeout(() => {
              setCanPlay(false);
              setVideoError('Video probe setup failed');
            }, 0);
        }
    }, [videoSrc]);

    // Handle theme changes and reload video
    useEffect(() => {
      if (videoRef.current && canPlay) {
        console.log('Reloading video for theme change:', { theme, src: videoSrc });
        videoRef.current.src = videoSrc;
        videoRef.current.load();
      }
    }, [theme, videoSrc, canPlay]);

    // If video is available, render it; otherwise render a themed gradient fallback
    if (canPlay) {
                return (
                        <video
                                ref={videoRef}
                                key={videoSrc} // Use key to force re-render when src changes
                                className="absolute top-0 left-0 w-full h-full object-cover video-background"
                                autoPlay
                                loop
                                muted
                                playsInline
                                aria-hidden
                                onCanPlayThrough={() => console.log('Video can play through:', videoSrc)}
                                onError={(e) => {
                                    const error = e.currentTarget.error;
                                    console.error('Dashboard video error:', {
                                        code: error?.code,
                                        message: error?.message,
                                        src: videoSrc,
                                        networkState: e.currentTarget.networkState,
                                        readyState: e.currentTarget.readyState
                                    });
                                    setCanPlay(false);
                                    setVideoError(`Video playback failed: ${error?.message || 'Unknown error'}`);
                                }}
                                data-video-src={videoSrc}
                                style={{ zIndex: 0, pointerEvents: 'none' }}
                        >
                                <source src={videoSrc} type="video/mp4" />
                        </video>
                );
    }

    // Fallback gradient background when video cannot be loaded
    const fallbackClass = theme === 'dark' ? 'bg-gradient-to-b from-[#0f1724] via-[#10243a] to-[#17324a]' : theme === 'gradient' ? 'bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-400' : 'bg-gradient-to-b from-white to-slate-100';
    return (
      <div className={`absolute inset-0 -z-10 ${fallbackClass}`} data-video-src={videoSrc}>
        {videoError && process.env.NODE_ENV === 'development' && (
          <div className="absolute top-4 right-4 bg-red-500 text-white text-xs p-2 rounded max-w-xs">
            Video Error: {videoError}
          </div>
        )}
      </div>
    );
}


export function ShoppingAssistant() {
    const [messages, setMessages]       = useState<Message[]>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [products, setProducts]       = useState<ProductService[]>([]);
    const [suppliers, setSuppliers]     = useState<Supplier[]>([]);
    const [scenarios, setScenarios]     = useState<AIScenario[]>([]);
    const [mediaAsset, setMediaAsset]   = useState<Partial<MediaAsset> & { previewUrl: string } | null>(null);
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAiSearching, startAiSearch] = useTransition();
    const scrollAreaRef                 = useRef<HTMLDivElement>(null);
    const fileInputRef                  = useRef<HTMLInputElement>(null);
    const { toast }                     = useToast();
    const { role, user, setUser }       = useAuthStore(); // UPDATED: Get setUser from store
    const router                        = useRouter();
    const form                          = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { description: "", scenarioId: "default" } });


    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch products, suppliers, and scenarios in parallel
                const [productsSnapshot, suppliersSnapshot, scenariosSnapshot] = await Promise.all([
                    getDocs(collection('products')),
                    getDocs(collection('suppliers')),
                    // compat layer doesn't yet support complex query translation; fetch all and filter client-side
                    getDocs(collection('ai_scenarios'))
                ]);

                // Process products
                const productsList = productsSnapshot.docs.map((doc: any) => {
                    const data = doc.data();
                    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                        data.createdAt = data.createdAt.toDate().toISOString();
                    }
                    return { ...data, id: doc.id } as ProductService;
                });
                setProducts(productsList);

                // Process suppliers and add the required 'category' field
                const suppliersList = suppliersSnapshot.docs.map((doc: any) => {
                    const data = doc.data() as Omit<Supplier, 'category'>;
                    return { ...data, id: doc.id, category: data.name } as Supplier;
                });
                setSuppliers(suppliersList);


                // Process scenarios
                const allScenarios = scenariosSnapshot.docs.map((doc: any) => ({id: doc.id, ...doc.data() } as AIScenario));
                const shoppingScenarios = allScenarios.filter((s: any) => Array.isArray(s.tags) && s.tags.includes('shopping'));
                setScenarios(shoppingScenarios);

                if (user && user.uid) {
                     const appointmentsSnapshot = await getDocs(collection('appointments'));
                     const appointmentsAll = appointmentsSnapshot.docs.map((d: any) => ({ ...d.data(), id: d.id } as Appointment));
                     const appointmentsSnapshotFiltered = appointmentsAll.filter((a: any) => a.requesterId === user.uid);
                     
                     const apptList = appointmentsSnapshotFiltered;
                    
                     const now = new Date();
                     const upcoming = apptList.filter((appt: any) => 
                         appt.status === 'confirmed' && 
                         appt.appointmentTime.toDate() > now &&
                         differenceInHours(appt.appointmentTime.toDate(), now) <= 24
                     ).sort((a: any, b: any) => a.appointmentTime.toMillis() - b.appointmentTime.toMillis());

                    setUpcomingAppointments(upcoming);
                }


            } catch (error) {
                console.error("AI场景数据加载失败:", error);
                const errorMessage = error instanceof Error ? error.message : '未知错误';
                let friendlyMessage = '无法加载AI场景数据，部分功能可能受限。';

                if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
                  friendlyMessage = '权限不足：无法加载AI场景配置，请联系管理员。';
                } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
                  friendlyMessage = '网络连接问题：AI场景功能暂时不可用，请稍后重试。';
                } else if (errorMessage.includes('not-found') || errorMessage.includes('未找到')) {
                  friendlyMessage = 'AI场景配置缺失：系统暂无智能场景配置，将使用默认推荐模式。';
                }

                toast({
                    title: 'AI场景加载失败',
                    description: friendlyMessage,
                    variant: 'destructive',
                });
            }
        };

        fetchInitialData();
    }, [toast, user]);
    
    useEffect(() => { scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);


    const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) {
            toast({ title: '错误', description: '请选择一个文件并确保您已登录。', variant: 'destructive' });
            return;
        }

        setIsUploading(true);
        try {
            const { uploadUrl, assetId } = await getUploadUrlForMediaAsset({ userId: user.uid, fileName: file.name, fileType: file.type });
            
            await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

            const objectUrl = URL.createObjectURL(file);
            setMediaAsset({ id: assetId, mediaType: file.type.split('/')[0] as MediaAsset['mediaType'], previewUrl: objectUrl });

            toast({ title: '上传成功', description: '媒体文件已准备好，请输入您的指令。' });
        } catch (error) {
            console.error('Media upload failed:', error);
            toast({ title: '上传失败', description: '无法上传您的媒体文件，请重试。', variant: 'destructive' });
        } finally {
            setIsUploading(false);
             if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const onInvalid = (errors: FieldErrors<FormValues>) => {
        const getFirstErrorMessage = (errs: any): string | null => {
            for (const key in errs) {
                if (errs[key]?.message) return errs[key].message;
                if (typeof errs[key] === 'object') {
                    const nested = getFirstErrorMessage(errs[key]);
                    if (nested) return nested;
                }
            }
            return null;
        };
        toast({ title: "表单验证失败", description: getFirstErrorMessage(errors) || "请检查您输入的内容。", variant: "destructive" });
    };
    
    const onSubmit = (values: FormValues) => {
        const userMessage: Message = { id: Date.now(), type: 'user', text: values.description, mediaPreviewUrl: mediaAsset?.previewUrl, mediaType: mediaAsset?.mediaType };
        const loadingMessage: Message = { id: Date.now() + 1, type: 'loading' };
        setMessages(prev => [...prev, userMessage, loadingMessage]);
        form.reset({ description: "", scenarioId: values.scenarioId });
        setMediaAsset(null);

        startAiSearch(async () => {
          let aiMessage: Message;
          try {
            let result: any;
            // New logic: Check for a selected scenario.
            if (values.scenarioId && values.scenarioId !== 'default') {
                result = await executePrompt({
                    prompt: values.description,
                    scenario: values.scenarioId,
                    userId: user?.uid || 'anonymous',
                });
                aiMessage = { id: Date.now() + 2, type: 'ai', text: result.output, isRawText: true };
            } else if (mediaAsset?.id) {
              result = await analyzeMediaAsset({ 
                assetId: mediaAsset.id, 
                assetUrl: mediaAsset.previewUrl || '', 
                userId: user?.uid || 'anonymous'
              });
              aiMessage = { id: Date.now() + 2, type: 'ai', text: JSON.stringify(result.analysis), isRawText: true };
            } else {
              // Fallback to the original product recommendation flow if no scenario is selected.
              result = await getProductRecommendations({ 
                userId: user?.uid || 'guest',
                preferences: values.description ? [values.description] : [],
                limit: 10
              });
              const recommendedProducts = products.filter(p => result.recommendations.some((r: any) => r.productId === p.id));
              aiMessage = { id: Date.now() + 2, type: 'ai', profile: undefined, recommendations: recommendedProducts, isRawText: false };
            }
            
            // UPDATED: Check for user update and refresh global state
            if (result.updatedUser) {
                const fullUser = result.updatedUser as AppUser;
                setUser(fullUser, fullUser.role);
            }
            
            setMessages(prev => prev.map((msg: Message) => (msg.id === loadingMessage.id ? aiMessage : msg)));

          } catch (error: any) {
            console.error("AI search failed:", error);
            const errorMessage: Message = { id: Date.now() + 2, type: 'ai', text: `抱歉，AI分析时遇到问题: ${error.message}`, isRawText: true };
            setMessages(prev => prev.map((msg: Message) => (msg.id === loadingMessage.id ? errorMessage : msg)));
            toast({ title: 'AI 分析失败', description: error.message || '请稍后重试。', variant: 'destructive' });
          }
        });
    };
      
    const hasAiResponse = messages.some(m => m.type === 'ai');

    return (
        <div className="relative flex flex-col p-4 md:p-8 min-h-[calc(100vh-57px)] md:min-h-screen">
            <DynamicVideoBackground />
            <div className="relative z-10">
                        {upcomingAppointments.length > 0 && (
                    <Alert variant="default" className="mb-4 border-amber-500 bg-amber-50/80 backdrop-blur-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertTitle className="font-headline text-amber-600">预约提醒</AlertTitle>
                    <AlertDescription>
                        您在24小时内有新的预约：
                        <ul className="list-disc pl-5 mt-2">
                        {upcomingAppointments.map((appt: any) => (
                            <li key={appt.id}>
                            与创意者的预约在 **{format(appt.appointmentTime.toDate(), 'M月d日 HH:mm', { locale: zhCN })}**
                            </li>
                        ))}
                        </ul>
                    </AlertDescription>
                    </Alert>
                )}
                <div className='text-center mb-4'>
                    <h1 className="text-2xl font-headline font-bold text-white shadow-black [text-shadow:_0_1px_10px_var(--tw-shadow-color)]">欢迎光临 Leverage</h1>
                    <p className="text-gray-200 mt-1 shadow-black [text-shadow:_0_1px_3px_var(--tw-shadow-color)]">与AI导购对话,发现为您量身推荐的独特设计,部分商品更支持个性化定制。</p>
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-1">
                    <div className="lg:col-span-3 flex flex-col">
                        <Card className="flex-1 flex flex-col bg-card/80 backdrop-blur-sm">
                            <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Bot/> AI购物助手</CardTitle><CardDescription>您好,我是您的专属购物助手。请问您在寻找什么?</CardDescription></CardHeader>
                            <CardContent className="flex-1 overflow-y-auto"><ScrollArea className="h-full" ref={scrollAreaRef}><div className="space-y-6 pr-4">
                                {messages.length > 0 && messages.map((msg: any) => {
                                    if (msg.type === 'user') return <UserMessage key={msg.id} {...msg} />;
                                    if (msg.type === 'ai') return <AIMessage key={msg.id} {...msg} />;
                                    if (msg.type === 'loading') return <LoadingMessage key={msg.id} />;
                                    return null;
                                })}
                            </div></ScrollArea></CardContent>
                            <CardFooter><Form {...form}><form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="w-full space-y-4">
                                {mediaAsset && ( <div className="relative w-24 h-24">{mediaAsset.mediaType === 'video' ? <video src={mediaAsset.previewUrl} className="w-full h-full rounded-md object-cover"/> : <Image src={mediaAsset.previewUrl!} alt="Preview" layout="fill" className="rounded-md object-cover"/>}<Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={() => setMediaAsset(null)}><X className="h-4 w-4" /></Button></div> )}
                                <FormField
                                    control={form.control}
                                    name="scenarioId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                    <div className="flex items-center gap-2">
                                                        <Puzzle className="w-4 h-4 text-muted-foreground"/>
                                                        <SelectValue placeholder="-- 优先从默认推荐 --" />
                                                    </div>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="default">-- 优先从默认推荐 --</SelectItem>
                                                    {scenarios.map((s: any) => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <div className="flex gap-2 items-end">
                                    <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                        <FormControl>
                                            <Textarea placeholder="描述您的需求..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <Input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleMediaUpload}/>
                                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>{isUploading ? <Loader2 className="animate-spin" /> : <Paperclip />}</Button>
                                    <Button type="submit" variant="primary-gradient" disabled={isAiSearching || isUploading}>{isAiSearching ? <Loader2 className="animate-spin" /> : <Send />}</Button>
                                </div>
                            </form></Form></CardFooter>
                        </Card>
                    </div>
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        {role === 'user' && hasAiResponse && <DemandPoolConnector />}
                        <CustomServiceConnector />
                    </div>
                </div>
            </div>
        </div>
    );
}

const UserMessage = ({ text, mediaPreviewUrl, mediaType }: Message) => (
  <div className="flex items-start gap-3 justify-end">
    <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-sm">
      {text && <p>{text}</p>}
      {mediaPreviewUrl && (
          <div className="mt-2">
              {mediaType === 'video' ? <video src={mediaPreviewUrl} controls className="w-full rounded-md" /> : <Image src={mediaPreviewUrl} alt="User upload" width={200} height={200} className="rounded-md" />}
          </div>
      )}
    </div>
    <User className="w-8 h-8 text-muted-foreground" />
  </div>
);
const AIMessage = ({ profile, recommendations, text, isRawText }: Message) => (
    <div className="flex items-start gap-3"><Bot className="w-8 h-8 text-accent flex-shrink-0" /><div className="bg-card/90 backdrop-blur-sm rounded-lg p-3 border space-y-4 w-full">
        {isRawText ? <p className="text-sm whitespace-pre-wrap">{text}</p> : <> <p className='font-semibold'>这是我根据您的需求分析的结果：</p> {profile && <UserProfileDisplay profile={profile} />} {recommendations && recommendations.length > 0 && <RecommendationsDisplay recommendations={recommendations} />} {(!recommendations || recommendations.length === 0) && <p className="text-sm text-muted-foreground">抱歉，暂时没有找到完全匹配的商品。</p>} </>}
    </div></div>
);
const LoadingMessage = () => (
    <div className="flex items-start gap-3"><Bot className="w-8 h-8 text-accent" /><div className="bg-card/90 backdrop-blur-sm rounded-lg p-3 max-w-sm border w-full"><div className="space-y-3"><p className='text-sm font-semibold text-muted-foreground'>AI 正在分析您的需求，请稍候...</p><Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /></div></div></div>
);
const CustomServiceConnector = () => { const router = useRouter(); return (<Card className="bg-card/80 backdrop-blur-sm"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Users/> 寻找创意师</CardTitle><CardDescription>浏览平台上的创意人才，查看他们的作品集和专长。</CardDescription></CardHeader><CardContent><Button className="w-full" variant="accent" onClick={() => router.push('/designers')}>寻找创意师 →</Button></CardContent></Card>); };
const DemandPoolConnector = () => { const router = useRouter(); return (<Card className="bg-accent/10 border-accent backdrop-blur-sm"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><FilePlus2/> 没找到满意的？</CardTitle><CardDescription>您可以将您的需求发布到需求池，让更多的供应商和创意者来帮助您。</CardDescription></CardHeader><CardContent><Button className="w-full" variant="primary-gradient" onClick={() => router.push('/demand-pool')}>发布到需求池</Button></CardContent></Card>); };
const UserProfileDisplay = ({ profile }: { profile: UserProfile }) => ( <Card className="bg-background/80 backdrop-blur-sm"><CardHeader className="p-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-accent"/> 用户画像分析</CardTitle></CardHeader><CardContent className="p-3 pt-0"><p className="text-sm text-muted-foreground mb-2">{profile.summary}</p><div className="flex flex-wrap gap-1">{profile.tags.map((tag: string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div></CardContent></Card> );
const RecommendationsDisplay = ({ recommendations }: { recommendations: ProductService[] }) => ( <div><h4 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> 首要推荐</h4><div className="space-y-3">{recommendations.map((rec) => ( <Card key={rec.id} className="overflow-hidden bg-background/80 backdrop-blur-sm"><div className="aspect-video relative w-full"><Image src={rec.imageUrl || `https://picsum.photos/seed/${rec.id}/300/200`} alt={rec.name} fill style={{objectFit: "cover"}}/></div><div className="p-3"><div className='flex justify-between items-start gap-2'><div><h5 className="font-semibold truncate pr-2">{rec.name}</h5>{rec.supplierName && <p className="text-xs text-muted-foreground">由 {rec.supplierName} 提供</p>}</div><p className="font-bold text-right text-primary whitespace-nowrap">¥{rec.price.toLocaleString()}</p></div></div>
    <CardFooter className="p-3 bg-muted/50 flex w-full justify-end gap-2">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => rec.purchaseUrl && window.open(rec.purchaseUrl, '_blank')}
                        disabled={!rec.purchaseUrl}
                    >
                        查看详情
                    </Button>
                </TooltipTrigger>
                {!rec.purchaseUrl && <TooltipContent><p>此商品暂无详情链接</p></TooltipContent>}
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        size="sm" 
                        onClick={() => rec.purchaseUrl && window.open(rec.purchaseUrl, '_blank')} 
                        disabled={!rec.purchaseUrl}
                    >
                        立即购买 <ExternalLink className="ml-1.5 h-3.5 w-3.5"/>
                    </Button>
                </TooltipTrigger>
                {!rec.purchaseUrl && <TooltipContent><p>此商品暂无购买链接</p></TooltipContent>}
            </Tooltip>
        </TooltipProvider>
    </CardFooter>
</Card>))}</div></div> );

// Export the DynamicVideoBackground component for testing
export { DynamicVideoBackground };
