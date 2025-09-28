
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Route, Loader2, Frown, Save, Wand2, BrainCircuit, Users, Clock } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import type { IntelligentRoutingStrategy } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// =================================================================
// MAIN PAGE COMPONENT
// =================================================================
export default function IntelligentRoutingModulePage() {
    const [strategy, setStrategy] = useState<IntelligentRoutingStrategy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [strategyText, setStrategyText] = useState('');
    const [factorTemperatures, setFactorTemperatures] = useState<{[key: string]: number}>({});

    const { role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();
    
    const defaultFactors = {
        problemCategory: { label: '问题类别匹配度', icon: BrainCircuit, description: 'AI分析用户问题与设计师技能的匹配程度。' },
        busyness: { label: '设计师闲忙程度', icon: Clock, description: '优先分配给排队人数少的设计师。' },
        userPriority: { label: '用户等级优先度', icon: Users, description: '高星级用户的请求是否应该被优先处理。' },
    };

    const fetchStrategy = useCallback(async () => {
        setIsLoading(true);
        try {
            const strategyRef = doc(db, 'intelligent_routing_strategy', 'main_strategy');
            const docSnap = await getDoc(strategyRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as IntelligentRoutingStrategy;
                setStrategy(data);
                setStrategyText(data.strategyText);
                setFactorTemperatures(data.factorTemperatures || {});
            } else {
                // If no strategy exists, create a default one
                const defaultStrategyData = {
                    strategyText: "优先将用户的请求分配给当前最空闲（排队人数最少）且在线的设计师。如果所有设计师都离线，则转给AI助理。",
                    factorTemperatures: {
                        problemCategory: 0.8,
                        busyness: 1.0,
                        userPriority: 0.5,
                    },
                    updatedAt: serverTimestamp(),
                };
                await setDoc(strategyRef, defaultStrategyData);
                setStrategy(defaultStrategyData as IntelligentRoutingStrategy);
                setStrategyText(defaultStrategyData.strategyText);
                setFactorTemperatures(defaultStrategyData.factorTemperatures);
            }
        } catch (error) {
            console.error("Failed to fetch routing strategy:", error);
            toast({ title: "加载失败", description: "无法加载智能路由策略。", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!isAuthLoading && role === 'admin') {
            fetchStrategy();
        }
    }, [isAuthLoading, role, fetchStrategy]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const strategyRef = doc(db, 'intelligent_routing_strategy', 'main_strategy');
            const dataToSave = {
                strategyText,
                factorTemperatures,
                updatedAt: serverTimestamp(),
            };
            await setDoc(strategyRef, dataToSave, { merge: true });
            toast({ title: '保存成功', description: '智能路由策略已更新。' });
            fetchStrategy(); // Refresh data
        } catch (error) {
            console.error("Failed to save strategy:", error);
            toast({ title: '保存失败', description: '更新策略时发生错误。', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleTemperatureChange = (factor: string, value: number) => {
        setFactorTemperatures(prev => ({...prev, [factor]: value}));
    }

    if (isAuthLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }
    
    if (role !== 'admin') {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <Frown className="w-16 h-16 mb-4 text-destructive"/>
                    <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
                    <p className="text-muted-foreground">此页面仅对管理员开放。</p>
                </div>
            </AppLayout>
        );
    }
    
    return (
        <AppLayout>
            <div className="p-4 md:p-8 space-y-8">
                <header>
                    <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
                        <Route />
                        智能路由策略
                    </h1>
                    <p className="text-muted-foreground">使用自然语言定义唯一的、全局生效的用户请求路由策略，并微调各决策因子的权重，AI将遵循此策略进行智能分配。</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">路由策略编辑器</CardTitle>
                        <CardDescription>
                            在此描述您希望系统如何将用户的请求分配给设计师，并调整不同因素的重要性（温度）。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-40 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                             <>
                                <Alert>
                                    <Wand2 className="h-4 w-4" />
                                    <AlertTitle>工作原理</AlertTitle>
                                    <AlertDescription>
                                        您在此处定义的策略和权重将作为最高指令，AI会结合用户的实时请求、设计师的在线状态、技能、排队数等信息，综合理解并执行您的策略，做出最优的分配决策。
                                    </AlertDescription>
                                </Alert>
                                <div className="space-y-2">
                                     <Label htmlFor="strategy-text">策略描述 (自然语言)</Label>
                                     <Textarea
                                        id="strategy-text"
                                        value={strategyText}
                                        onChange={(e) => setStrategyText(e.target.value)}
                                        rows={6}
                                        placeholder="例如：优先将用户的请求分配给当前最空闲且在线的设计师..."
                                    />
                                </div>
                               
                               <div className="space-y-6 pt-4">
                                    <h4 className="font-medium">决策因子权重 (温度)</h4>
                                     {Object.entries(defaultFactors).map(([key, { label, icon: Icon, description }]) => (
                                        <div key={key} className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label htmlFor={`${key}-slider`} className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground"/> {label}</Label>
                                                <Badge variant="outline" className="font-mono">{factorTemperatures[key]?.toFixed(1) || '0.0'}</Badge>
                                            </div>
                                            <Slider
                                                id={`${key}-slider`}
                                                value={[factorTemperatures[key] || 0]}
                                                onValueChange={(value) => handleTemperatureChange(key, value[0])}
                                                min={0}
                                                max={1}
                                                step={0.1}
                                            />
                                            <p className="text-xs text-muted-foreground">{description} (0.0表示不重要, 1.0表示最重要)</p>
                                        </div>
                                    ))}
                               </div>
                             </>
                         )}
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleSave} disabled={isLoading || isSaving}>
                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                            保存策略
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </AppLayout>
    );
}
