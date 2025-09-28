
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Route, Loader2, Frown, Save, Wand2, BrainCircuit, Users, Clock, Edit, PlusCircle, Trash2, Settings, Hourglass, Star, Briefcase, Repeat, Calendar as CalendarIcon, Info } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore, type Role } from '@/store/auth';
import { useRouter } from 'next/navigation';
import type { IntelligentRoutingStrategy, DecisionFactor, StrategyRule } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimePicker } from '@/components/ui/time-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// =================================================================
// HELPER TYPES AND CONSTANTS
// =================================================================

type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAYS_OF_WEEK: { id: DayOfWeek; label: string }[] = [
    { id: 'mon', label: '周一' }, { id: 'tue', label: '周二' }, { id: 'wed', label: '周三' },
    { id: 'thu', label: '周四' }, { id: 'fri', label: '周五' }, { id: 'sat', label: '周六' },
    { id: 'sun', label: '周日' }
];
const ALL_ROLES: Role[] = ['admin', 'creator', 'supplier', 'user'];
const ROLE_NAMES: Record<Role, string> = {
    admin: '管理员',
    creator: '创意者',
    supplier: '供应商',
    user: '普通用户',
    suspended: '已禁用',
};


// =================================================================
// STRATEGY RULE DIALOG
// =================================================================

function StrategyRuleDialog({
    open,
    onOpenChange,
    onSave,
    rule: initialRule,
    allFactors
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (rule: StrategyRule) => void;
    rule: StrategyRule | null;
    allFactors: DecisionFactor[];
}) {
    const isEditing = !!initialRule;
    const [rule, setRule] = useState<StrategyRule>(
        initialRule || {
            id: `rule_${Date.now()}`,
            name: '',
            priority: 10,
            conditions: { ruleLogic: 'and' },
            actions: { type: 'apply_weights', factorTemperatures: {} }
        }
    );

    useEffect(() => {
        if (initialRule) {
            setRule(initialRule);
        } else {
             setRule({
                id: `rule_${Date.now()}`,
                name: '',
                priority: 10,
                conditions: { ruleLogic: 'and' },
                actions: { type: 'apply_weights', factorTemperatures: {} }
            });
        }
    }, [initialRule]);

    const handleSave = () => {
        onSave(rule);
        onOpenChange(false);
    };

    const handleConditionChange = (field: keyof StrategyRule['conditions'], value: any) => {
        setRule(prev => ({...prev, conditions: { ...prev.conditions, [field]: value }}));
    };
    
    const handleDayToggle = (day: DayOfWeek) => {
        const currentDays = rule.conditions.daysOfWeek || [];
        const newDays = currentDays.includes(day) ? currentDays.filter(d => d !== day) : [...currentDays, day];
        handleConditionChange('daysOfWeek', newDays);
    };
    
    const handleRoleToggle = (role: Role) => {
        const currentRoles = { ...(rule.conditions.targetUserRoles || {}) };
        if (currentRoles[role]) {
            delete currentRoles[role];
        } else {
            currentRoles[role] = [];
        }
        handleConditionChange('targetUserRoles', currentRoles);
    };

    const handleRatingToggle = (role: Role, rating: number) => {
        const currentRoles = { ...(rule.conditions.targetUserRoles || {}) };
        const currentRatings = currentRoles[role] || [];
        const newRatings = currentRatings.includes(rating) ? currentRatings.filter(r => r !== rating) : [...currentRatings, rating];
        currentRoles[role] = newRatings;
        handleConditionChange('targetUserRoles', currentRoles);
    };

    const handleActionTemperatureChange = (factorId: string, value: number) => {
        if(rule.actions.type !== 'apply_weights') return;

        setRule(prev => ({
            ...prev,
            actions: {
                ...prev.actions,
                factorTemperatures: {
                    ...(prev.actions.factorTemperatures || {}),
                    [factorId]: value,
                }
            }
        }));
    }

    const { conditions, actions } = rule;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">{isEditing ? '编辑高级策略' : '新增高级策略'}</DialogTitle>
                    <DialogDescription>为特定的场景创建一条优先执行的路由规则。</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="rule-name">策略名称</Label>
                            <Input id="rule-name" value={rule.name} onChange={e => setRule(prev => ({ ...prev, name: e.target.value }))} placeholder="例如：VIP用户优先通道" />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="rule-priority">优先级 (数字越小越高)</Label>
                            <Input id="rule-priority" type="number" value={rule.priority} onChange={e => setRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 10 }))} />
                        </div>
                    </div>
                    
                    <Accordion type="multiple" className="w-full" defaultValue={['conditions', 'actions']}>
                        <AccordionItem value="conditions">
                             <AccordionTrigger><div className="flex items-center gap-2 font-semibold"><Settings className="w-4 h-4"/> 生效规则 (Conditions)</div></AccordionTrigger>
                             <AccordionContent className="space-y-4 pt-4">
                                <p className="text-sm text-muted-foreground">当以下规则被满足时，此策略将被触发。</p>
                                <Accordion type="multiple" className="w-full">
                                    <AccordionItem value="time">
                                        <AccordionTrigger><div className="flex items-center gap-2"><Clock className="w-4 h-4"/> 时间维度</div></AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                             <div className="flex items-center space-x-2 p-4 border rounded-md bg-muted/30">
                                                <Checkbox id="enable-repetition" checked={!!conditions.repetition && conditions.repetition !== 'none'} onCheckedChange={(checked) => handleConditionChange('repetition', checked ? 'daily' : 'none')} />
                                                <Label htmlFor="enable-repetition" className="font-medium">启用重复策略</Label>
                                            </div>
                                             {(conditions.repetition && conditions.repetition !== 'none') ? (
                                                <div className="p-4 border rounded-md space-y-4">
                                                    <div className="grid grid-cols-2 gap-4 items-center">
                                                        <div>
                                                            <Label>重复频率</Label>
                                                            <RadioGroup value={conditions.repetition} onValueChange={(v) => handleConditionChange('repetition', v)} className="flex mt-2"><RadioGroupItem value="daily" id="daily" /><Label htmlFor="daily" className="mr-4">每天</Label><RadioGroupItem value="weekly" id="weekly" /><Label htmlFor="weekly">每周</Label></RadioGroup>
                                                        </div>
                                                        {conditions.repetition === 'weekly' && (
                                                            <div>
                                                                <Label>选择星期</Label>
                                                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                                                    {DAYS_OF_WEEK.map(day => (
                                                                        <div key={day.id} className="flex items-center space-x-1"><Checkbox id={`day-${day.id}`} checked={conditions.daysOfWeek?.includes(day.id)} onCheckedChange={() => handleDayToggle(day.id)} /><Label htmlFor={`day-${day.id}`} className="text-xs font-normal">{day.label}</Label></div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div><Label>生效时间窗口</Label><div className="flex items-center gap-2"><TimePicker date={conditions.startTime ? new Date(`1970-01-01T${conditions.startTime}`) : undefined} setDate={(d) => handleConditionChange('startTime', d ? format(d, 'HH:mm') : undefined)} /><span>-</span><TimePicker date={conditions.endTime ? new Date(`1970-01-01T${conditions.endTime}`) : undefined} setDate={(d) => handleConditionChange('endTime', d ? format(d, 'HH:mm') : undefined)} /></div></div>
                                                </div>
                                            ) : (
                                                <div className="p-4 border rounded-md space-y-4"><Label>绝对时间范围 (一次性生效)</Label><div className="grid grid-cols-2 gap-4">
                                                    <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !conditions.startsAt && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{conditions.startsAt ? format((conditions.startsAt as Timestamp).toDate(), "yyyy-MM-dd HH:mm") : <span>选择生效时间</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={conditions.startsAt ? (conditions.startsAt as Timestamp).toDate() : undefined} onSelect={d => handleConditionChange('startsAt', d ? Timestamp.fromDate(d) : undefined)} initialFocus /><div className="p-3 border-t border-border"><TimePicker date={conditions.startsAt ? (conditions.startsAt as Timestamp).toDate() : undefined} setDate={d => handleConditionChange('startsAt', d ? Timestamp.fromDate(d) : undefined)} /></div></PopoverContent></Popover>
                                                    <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !conditions.expiresAt && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{conditions.expiresAt ? format((conditions.expiresAt as Timestamp).toDate(), "yyyy-MM-dd HH:mm") : <span>选择失效时间</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={conditions.expiresAt ? (conditions.expiresAt as Timestamp).toDate() : undefined} onSelect={d => handleConditionChange('expiresAt', d ? Timestamp.fromDate(d) : undefined)} /><div className="p-3 border-t border-border"><TimePicker date={conditions.expiresAt ? (conditions.expiresAt as Timestamp).toDate() : undefined} setDate={d => handleConditionChange('expiresAt', d ? Timestamp.fromDate(d) : undefined)} /></div></PopoverContent></Popover>
                                                </div></div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                     <div className="flex items-center justify-center py-2"><RadioGroup value={conditions.ruleLogic} onValueChange={(v) => handleConditionChange('ruleLogic', v)} className="flex items-center space-x-4 border p-2 rounded-lg bg-muted/30"><RadioGroupItem value="and" id="logic-and" /><Label htmlFor="logic-and">同时满足 (与)</Label><RadioGroupItem value="or" id="logic-or" /><Label htmlFor="logic-or">满足任意一个 (或)</Label></RadioGroup></div>
                                    <AccordionItem value="user">
                                        <AccordionTrigger><div className="flex items-center gap-2"><Users className="w-4 h-4"/> 用户维度</div></AccordionTrigger>
                                        <AccordionContent className="pt-4 space-y-4"><p className="text-sm text-muted-foreground">限定目标用户。若不勾选任何角色，则默认对所有用户生效。</p><div className="space-y-3">{ALL_ROLES.map(role => (<div key={role} className="p-3 border rounded-md"><div className="flex items-center space-x-2"><Checkbox id={`role-${role}`} checked={!!conditions.targetUserRoles?.[role]} onCheckedChange={() => handleRoleToggle(role)} /><Label htmlFor={`role-${role}`} className="text-sm font-medium">{ROLE_NAMES[role]}</Label></div>{conditions.targetUserRoles?.[role] && (<div className="pt-3 mt-3 border-t"><Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Star className="w-3 h-3"/> 限定星级 (不选则对该角色所有星级生效)</Label><div className="flex flex-wrap gap-x-3 gap-y-1">{Array.from({length: 10}, (_, i) => i + 1).map(rating => (<div key={rating} className="flex items-center space-x-1"><Checkbox id={`rating-${role}-${rating}`} checked={conditions.targetUserRoles?.[role]?.includes(rating)} onCheckedChange={() => handleRatingToggle(role, rating)}/><Label htmlFor={`rating-${role}-${rating}`} className="text-xs font-normal">{rating}星</Label></div>))}</div></div>)}</div>))}</div></AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                             </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="actions">
                            <AccordionTrigger><div className="flex items-center gap-2 font-semibold"><Wand2 className="w-4 h-4"/> 执行动作 (Actions)</div></AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-4">
                               <p className="text-sm text-muted-foreground">当规则满足时，执行以下动作来覆盖默认的全局策略。</p>
                                {/* Here we can add different action types, for now only apply_weights */}
                                {actions.type === 'apply_weights' && (
                                     <div className="space-y-6 pt-4">
                                        <h4 className="font-medium">此策略专属的因子权重</h4>
                                        {allFactors.map((factor) => {
                                            const Icon = getIconComponent(factor.icon);
                                            const currentTemp = actions.factorTemperatures?.[factor.id] ?? 0.5;
                                            return (
                                                <div key={factor.id} className="space-y-3">
                                                    <div className="flex justify-between items-center"><Label htmlFor={`${factor.id}-slider-rule`} className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /> {factor.name}</Label><Badge variant="outline" className="font-mono">{currentTemp.toFixed(1)}</Badge></div>
                                                    <Slider id={`${factor.id}-slider-rule`} value={[currentTemp]} onValueChange={(value) => handleActionTemperatureChange(factor.id, value[0])} min={0} max={1} step={0.1} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleSave}>保存策略规则</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
    const [currentFactors, setCurrentFactors] = useState(factors);

    useEffect(() => {
        setCurrentFactors(factors);
    }, [factors]);

    const handleAddFactor = () => {
        const newId = `custom-factor-${Date.now()}`;
        setCurrentFactors([
            ...currentFactors,
            {
                id: newId,
                name: '新因子',
                description: '请填写描述',
                icon: 'Settings',
            },
        ]);
    };

    const handleRemoveFactor = (id: string) => {
        setCurrentFactors(currentFactors.filter(f => f.id !== id));
    };

    const handleFactorChange = (id: string, field: keyof DecisionFactor, value: string) => {
        setCurrentFactors(currentFactors.map(f => f.id === id ? { ...f, [field]: value } : f));
    }

    const handleSave = () => {
        onFactorsChange(currentFactors);
        onOpenChange(false);
    }

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
                    {currentFactors.map(factor => (
                        <Card key={factor.id} className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold">{factor.name}</h4>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveFactor(factor.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                            <div className="space-y-3">
                                <Input placeholder="因子ID" value={factor.id} disabled />
                                <Input placeholder="因子名称" value={factor.name} onChange={e => handleFactorChange(factor.id, 'name', e.target.value)} />
                                <Input placeholder="因子描述" value={factor.description} onChange={e => handleFactorChange(factor.id, 'description', e.target.value)} />
                                <Input placeholder="Lucide图标名称" value={factor.icon} onChange={e => handleFactorChange(factor.id, 'icon', e.target.value)} />
                            </div>
                        </Card>
                    ))}
                    <Button onClick={handleAddFactor} variant="outline" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        添加新因子
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleSave}>保存更改</Button>
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
    
    // State for the default/global strategy
    const [strategyText, setStrategyText] = useState('');
    const [factors, setFactors] = useState<DecisionFactor[]>([]);
    const [factorTemperatures, setFactorTemperatures] = useState<{ [key: string]: number }>({});
    const [advancedRules, setAdvancedRules] = useState<StrategyRule[]>([]);

    // State for modals
    const [isFactorModalOpen, setIsFactorModalOpen] = useState(false);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [currentRule, setCurrentRule] = useState<StrategyRule | null>(null);

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
                setAdvancedRules(data.advancedRules || []);
            } else {
                const defaultStrategyData: IntelligentRoutingStrategy = {
                    id: 'main_strategy',
                    strategyText: "优先将用户的请求分配给当前最空闲（排队人数最少）且技能最匹配的设计师。如果所有设计师都离线，则转给AI助理。",
                    factors: [
                        { id: 'problem_category', name: '问题类别匹配度', description: 'AI分析用户问题与设计师技能标签的匹配程度。', icon: 'BrainCircuit' },
                        { id: 'busyness', name: '设计师闲忙程度', description: '优先分配给排队人数少的设计师。', icon: 'Hourglass' },
                        { id: 'user_priority', name: '用户等级优先度', description: '高星级用户的请求是否应该被优先处理。', icon: 'Star' },
                    ],
                    factorTemperatures: { problem_category: 0.8, busyness: 1.0, user_priority: 0.5 },
                    advancedRules: [],
                    updatedAt: serverTimestamp(),
                };
                await setDoc(strategyRef, defaultStrategyData);
                setStrategy(defaultStrategyData);
                setStrategyText(defaultStrategyData.strategyText);
                setFactors(defaultStrategyData.factors);
                setFactorTemperatures(defaultStrategyData.factorTemperatures);
                setAdvancedRules(defaultStrategyData.advancedRules || []);
            }
        } catch (error) {
            toast({ title: "加载失败", description: "无法加载智能路由策略。", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!isAuthLoading && role === 'admin') fetchStrategy();
    }, [isAuthLoading, role, fetchStrategy]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const strategyRef = doc(db, 'intelligent_routing_strategy', 'main_strategy');
            const finalTemperatures: { [key: string]: number } = {};
            factors.forEach(factor => { finalTemperatures[factor.id] = factorTemperatures[factor.id] ?? 0.5; });
            
            const dataToSave: IntelligentRoutingStrategy = {
                id: 'main_strategy',
                strategyText,
                factors,
                factorTemperatures: finalTemperatures,
                advancedRules,
                updatedAt: serverTimestamp(),
            };
            await setDoc(strategyRef, dataToSave, { merge: true });
            toast({ title: '保存成功', description: '智能路由策略已更新。' });
            fetchStrategy();
        } catch (error) {
            toast({ title: '保存失败', description: '更新策略时发生错误。', variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTemperatureChange = (factorId: string, value: number) => {
        setFactorTemperatures(prev => ({ ...prev, [factorId]: value }));
    }

    const handleFactorsChange = (newFactors: DecisionFactor[]) => {
        setFactors(newFactors);
        const newTemperatures: { [key: string]: number } = {};
        newFactors.forEach(factor => { newTemperatures[factor.id] = factorTemperatures[factor.id] ?? 0.5; });
        setFactorTemperatures(newTemperatures);
    };

    const handleSaveRule = (ruleToSave: StrategyRule) => {
        const index = advancedRules.findIndex(r => r.id === ruleToSave.id);
        if (index > -1) {
            const newRules = [...advancedRules];
            newRules[index] = ruleToSave;
            setAdvancedRules(newRules);
        } else {
            setAdvancedRules([...advancedRules, ruleToSave]);
        }
    };

    const handleDeleteRule = (ruleId: string) => {
        setAdvancedRules(advancedRules.filter(r => r.id !== ruleId));
    };

    const getIconComponent = (iconName: string) => {
        switch (iconName) {
            case 'BrainCircuit': return BrainCircuit; case 'Hourglass': return Hourglass;
            case 'Star': return Star; case 'Briefcase': return Briefcase;
            case 'Clock': return Clock; case 'Repeat': return Repeat;
            default: return Settings;
        }
    };

    const formatRuleSummary = (rule: StrategyRule): string => {
        const { conditions } = rule;
        let parts = [];
        if (conditions.repetition && conditions.repetition !== 'none') {
            parts.push('有重复时间规则');
        } else if (conditions.startsAt || conditions.expiresAt) {
            parts.push('有绝对时间规则');
        }
        if (conditions.targetUserRoles && Object.keys(conditions.targetUserRoles).length > 0) {
            parts.push('有用户规则');
        }
        return parts.length > 0 ? parts.join(` ${conditions.ruleLogic === 'or' ? '或' : '且'} `) : '无生效条件';
    };


    if (isAuthLoading || isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }
    if (role !== 'admin') {
        return <AppLayout><div className="flex flex-col items-center justify-center h-full p-4 text-center"><Frown className="w-16 h-16 mb-4 text-destructive" /><h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2><p className="text-muted-foreground">此页面仅对管理员开放。</p></div></AppLayout>;
    }

    return (
        <AppLayout>
            <div className="p-4 md:p-8 space-y-8">
                <header>
                    <h1 className="text-2xl font-headline font-bold flex items-center gap-2"><Route /> 智能路由策略</h1>
                    <p className="text-muted-foreground">使用自然语言定义唯一的、全局生效的用户请求路由策略，并微调各决策因子的权重，AI将遵循此策略进行智能分配。</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">默认全局策略</CardTitle>
                        <CardDescription>这是所有路由请求的兜底策略。当没有任何高级策略被触发时，系统将使用此处的配置。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert><Wand2 className="h-4 w-4" /><AlertTitle>工作原理</AlertTitle><AlertDescription>您在此处定义的策略和权重将作为最高指令，AI会结合用户的实时请求、设计师的在线状态、技能、排队数等信息，综合理解并执行您的策略，做出最优的分配决策。</AlertDescription></Alert>
                        <div className="space-y-2"><Label htmlFor="strategy-text">策略描述 (自然语言)</Label><Textarea id="strategy-text" value={strategyText} onChange={(e) => setStrategyText(e.target.value)} rows={4} placeholder="例如：优先将用户的请求分配给当前最空闲且在线的设计师..." /></div>
                        <div className="space-y-6 pt-4"><h4 className="font-medium">全局决策因子权重 (温度)</h4>{factors.map((factor) => { const Icon = getIconComponent(factor.icon); return (<div key={factor.id} className="space-y-3"><div className="flex justify-between items-center"><Label htmlFor={`${factor.id}-slider`} className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /> {factor.name}</Label><Badge variant="outline" className="font-mono">{factorTemperatures[factor.id]?.toFixed(1) || '0.5'}</Badge></div><Slider id={`${factor.id}-slider`} value={[factorTemperatures[factor.id] || 0.5]} onValueChange={(value) => handleTemperatureChange(factor.id, value[0])} min={0} max={1} step={0.1} /><p className="text-xs text-muted-foreground">{factor.description} (0.0表示不重要, 1.0表示最重要)</p></div>) })}</div>
                    </CardContent>
                     <CardFooter className="flex justify-between">
                        <div></div>
                        <Button variant="outline" onClick={() => setIsFactorModalOpen(true)} disabled={isLoading}><Edit className="mr-2 h-4 w-4" /> 编辑全局因子</Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div><CardTitle className="font-headline">高级路由策略</CardTitle><CardDescription>创建带有生效条件的优先策略。系统将按优先级从高到低检查，并执行第一个满足条件的策略。</CardDescription></div>
                            <Button onClick={() => { setCurrentRule(null); setIsRuleModalOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>新增策略</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>优先级</TableHead><TableHead>策略名称</TableHead><TableHead>生效规则摘要</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {advancedRules.length === 0 ? (<TableRow><TableCell colSpan={4} className="h-24 text-center">暂无高级策略。</TableCell></TableRow>) : (
                                    advancedRules.sort((a, b) => a.priority - b.priority).map(rule => (
                                        <TableRow key={rule.id}>
                                            <TableCell><Badge>{rule.priority}</Badge></TableCell>
                                            <TableCell className="font-semibold">{rule.name}</TableCell>
                                            <TableCell><Badge variant="outline">{formatRuleSummary(rule)}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => { setCurrentRule(rule); setIsRuleModalOpen(true); }}><Edit className="mr-2 h-4 w-4"/>编辑</Button>
                                                <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteRule(rule.id)}><Trash2 className="mr-2 h-4 w-4"/>删除</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                
                <div className="flex justify-center mt-8">
                     <Button size="lg" onClick={handleSave} disabled={isLoading || isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        保存所有路由配置
                    </Button>
                </div>

            </div>
             <FactorManagementDialog open={isFactorModalOpen} onOpenChange={setIsFactorModalOpen} factors={factors} onFactorsChange={handleFactorsChange} />
             <StrategyRuleDialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen} onSave={handleSaveRule} rule={currentRule} allFactors={factors} />
        </AppLayout>
    );
}

