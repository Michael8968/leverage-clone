

'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Route, Loader2, Frown, Save, Wand2, BrainCircuit, Users, Clock, Edit, PlusCircle, Trash2, Settings, Hourglass, Star, Briefcase, Repeat } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import type { IntelligentRoutingStrategy, DecisionFactor } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';


// =================================================================
// FACTOR MANAGEMENT DIALOG
// =================================================================
function FactorManagementDialog({
    open,
    onOpenChange,
    factors,
    onFactorsChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    factors: DecisionFactor[];
    onFactorsChange: (factors: DecisionFactor[]) => void;
}) {
    const [newFactorName, setNewFactorName] = useState('');
    const [newFactorId, setNewFactorId] = useState('');
    const [newFactorDescription, setNewFactorDescription] = useState('');

    const handleAddFactor = () => {
        if (!newFactorName || !newFactorId || !newFactorDescription) {
            alert('请填写所有字段');
            return;
        }
        onFactorsChange([
            ...factors,
            {
                id: newFactorId,
                name: newFactorName,
                description: newFactorDescription,
                icon: 'Settings', // Default icon
            },
        ]);
        setNewFactorName('');
        setNewFactorId('');
        setNewFactorDescription('');
    };

    const handleRemoveFactor = (id: string) => {
        onFactorsChange(factors.filter(f => f.id !== id));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>编辑决策因子</DialogTitle>
                    <DialogDescription>
                        在这里增加、修改或删除影响AI路由决策的因子。
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                        {factors.map(factor => (
                            <div key={factor.id} className="flex items-center justify-between p-2 rounded-md border">
                                <div className="flex flex-col">
                                   <span className="font-semibold">{factor.name}</span>
                                   <span className="text-xs text-muted-foreground">{factor.description}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveFactor(factor.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-3 p-4 border-t">
                        <h4 className="font-semibold">新增因子</h4>
                        <Input placeholder="因子ID (英文,唯一)" value={newFactorId} onChange={e => setNewFactorId(e.target.value.toLowerCase().replace(/\s/g, '_'))} />
                        <Input placeholder="因子名称" value={newFactorName} onChange={e => setNewFactorName(e.target.value)} />
                        <Input placeholder="因子描述" value={newFactorDescription} onChange={e => setNewFactorDescription(e.target.value)} />
                        <Button onClick={handleAddFactor} className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            添加新因子
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>完成</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================
export default function IntelligentRoutingModulePage() {
    const [strategy, setStrategy] = useState<IntelligentRoutingStrategy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [strategyText, setStrategyText] = useState('');
    const [factors, setFactors] = useState<DecisionFactor[]>([]);
    const [factorTemperatures, setFactorTemperatures] = useState<{ [key: string]: number }>({});
    const [isFactorModalOpen, setIsFactorModalOpen] = useState(false);

    const { role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();

    const fetchStrategy = useCallback(async () => {
        setIsLoading(true);
        try {
            const strategyRef = doc(db, 'intelligent_routing_strategy', 'main_strategy');
            const docSnap = await getDoc(strategyRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as IntelligentRoutingStrategy;
                setStrategy(data);
                setStrategyText(data.strategyText);
                setFactors(data.factors || []);
                setFactorTemperatures(data.factorTemperatures || {});
            } else {
                const defaultStrategyData: IntelligentRoutingStrategy = {
                    id: 'main_strategy',
                    strategyText: "优先将用户的请求分配给当前最空闲（排队人数最少）且技能最匹配的设计师。如果所有设计师都离线，则转给AI助理。",
                    factors: [
                        { id: 'problem_category', name: '问题类别匹配度', description: 'AI分析用户问题与设计师技能标签的匹配程度。', icon: 'BrainCircuit' },
                        { id: 'busyness', name: '设计师闲忙程度', description: '优先分配给排队人数少的设计师。', icon: 'Hourglass' },
                        { id: 'user_priority', name: '用户等级优先度', description: '高星级用户的请求是否应该被优先处理。', icon: 'Star' },
                        { id: 'specialty_match', name: '专业特长匹配度', description: 'AI对用户需求的深层理解与设计师专业特长的匹配度。', icon: 'Briefcase' },
                        { id: 'working_hours', name: '工作时间匹配度', description: '路由决策是否应严格遵守设计师设定的工作时间。', icon: 'Clock' },
                        { id: 'route_back_preference', name: '首接设计师优先', description: '当对话被转接时，是否优先转回给最初接待该用户的设计师。', icon: 'Repeat' },
                    ],
                    factorTemperatures: {
                        problem_category: 0.8,
                        busyness: 1.0,
                        user_priority: 0.5,
                        specialty_match: 0.7,
                        working_hours: 0.4,
                        route_back_preference: 0.6,
                    },
                    updatedAt: serverTimestamp(),
                };
                await setDoc(strategyRef, defaultStrategyData);
                setStrategy(defaultStrategyData);
                setStrategyText(defaultStrategyData.strategyText);
                setFactors(defaultStrategyData.factors);
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
            // Clean up temperatures for factors that no longer exist
            const finalTemperatures: { [key: string]: number } = {};
            factors.forEach(factor => {
                finalTemperatures[factor.id] = factorTemperatures[factor.id] ?? 0.5;
            });
            
            const dataToSave = {
                strategyText,
                factors,
                factorTemperatures: finalTemperatures,
                updatedAt: serverTimestamp(),
            };
            await setDoc(strategyRef, dataToSave, { merge: true });
            toast({ title: '保存成功', description: '智能路由策略已更新。' });
            fetchStrategy(); // Refresh data
        } catch (error) {
            console.error("Failed to save strategy:", error);
            toast({ title: '保存失败', description: '更新策略时发生错误。', variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTemperatureChange = (factor: string, value: number) => {
        setFactorTemperatures(prev => ({ ...prev, [factor]: value }));
    }

    const handleFactorsChange = (newFactors: DecisionFactor[]) => {
        setFactors(newFactors);
        // Also update temperatures, removing any that are no longer in factors
        const newTemperatures: { [key: string]: number } = {};
        newFactors.forEach(factor => {
            newTemperatures[factor.id] = factorTemperatures[factor.id] ?? 0.5;
        });
        setFactorTemperatures(newTemperatures);
    };

    const getIconComponent = (iconName: string) => {
        switch (iconName) {
            case 'BrainCircuit': return BrainCircuit;
            case 'Hourglass': return Hourglass;
            case 'Star': return Star;
            case 'Briefcase': return Briefcase;
            case 'Clock': return Clock;
            case 'Repeat': return Repeat;
            default: return Settings;
        }
    };

    if (isAuthLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (role !== 'admin') {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <Frown className="w-16 h-16 mb-4 text-destructive" />
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
                                    {factors.map((factor) => {
                                        const Icon = getIconComponent(factor.icon);
                                        return (
                                            <div key={factor.id} className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <Label htmlFor={`${factor.id}-slider`} className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /> {factor.name}</Label>
                                                    <Badge variant="outline" className="font-mono">{factorTemperatures[factor.id]?.toFixed(1) || '0.5'}</Badge>
                                                </div>
                                                <Slider
                                                    id={`${factor.id}-slider`}
                                                    value={[factorTemperatures[factor.id] || 0.5]}
                                                    onValueChange={(value) => handleTemperatureChange(factor.id, value[0])}
                                                    min={0}
                                                    max={1}
                                                    step={0.1}
                                                />
                                                <p className="text-xs text-muted-foreground">{factor.description} (0.0表示不重要, 1.0表示最重要)</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button onClick={handleSave} disabled={isLoading || isSaving}>
                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                            保存策略
                        </Button>
                        <Button variant="outline" onClick={() => setIsFactorModalOpen(true)} disabled={isLoading}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑因子
                        </Button>
                    </CardFooter>
                </Card>
            </div>
             <FactorManagementDialog
                open={isFactorModalOpen}
                onOpenChange={setIsFactorModalOpen}
                factors={factors}
                onFactorsChange={handleFactorsChange}
            />
        </AppLayout>
    );
}
