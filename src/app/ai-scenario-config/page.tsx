
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Puzzle, Edit, Workflow, Loader2, Frown, Users, Clock, Settings2, Calendar as CalendarIcon, Repeat, Info, Star, PlusCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, type Role } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { collection, doc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getPrompts, type GetPromptsOutput } from '@/ai/flows/admin-management-flows';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimePicker } from '@/components/ui/time-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';


// =================================================================
// TYPE DEFINITIONS & MOCK DATA
// =================================================================

type Repetition = 'none' | 'daily' | 'weekly';
type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type RuleLogic = 'and' | 'or';
type TargetUserRoles = { [key in Role]?: number[] };


type ScenarioDefinition = {
    id: string;
    name: string;
    description: string;
};

type ScenarioConfig = {
    configuredPromptKey: string;
    // New, more detailed time configuration
    repetition?: Repetition;
    daysOfWeek?: DayOfWeek[];
    startTime?: string; // HH:mm format
    endTime?: string; // HH:mm format
    // Absolute time is still supported
    startsAt?: Timestamp;
    expiresAt?: Timestamp;
    targetUserRoles?: TargetUserRoles;
    ruleLogic?: RuleLogic;
};

type FullScenario = ScenarioDefinition & Partial<ScenarioConfig>;


const PREDEFINED_SCENARIOS: ScenarioDefinition[] = [
    {
        id: 'chat-assistant',
        name: '聊天对话 - AI助理',
        description: '在供需双方的聊天中，辅助创意者向用户提出澄清问题，挖掘更深层次的需求。',
    },
    {
        id: 'shopping-assistant-recommendation',
        name: 'AI购物助手 - 商品推荐',
        description: '在用户输入模糊需求后，负责分析用户画像并从产品库中推荐相关商品的默认行为。',
    },
    {
        id: 'demand-matching',
        name: '需求池 - 创意匹配',
        description: '在需求池中，为指定的需求匹配最合适的创意方（产品或供应商）。',
    },
];

const ALL_ROLES: Role[] = ['admin', 'creator', 'supplier', 'user'];
const ROLE_NAMES: Record<Role, string> = {
    admin: '管理员',
    creator: '创意者',
    supplier: '供应商',
    user: '普通用户'
};
const DAYS_OF_WEEK: { id: DayOfWeek; label: string }[] = [
    { id: 'mon', label: '周一' }, { id: 'tue', label: '周二' }, { id: 'wed', label: '周三' },
    { id: 'thu', label: '周四' }, { id: 'fri', label: '周五' }, { id: 'sat', label: '周六' },
    { id: 'sun', label: '周日' }
];


// =================================================================
// EDIT DIALOG COMPONENT
// =================================================================
function ScenarioEditDialog({ 
    scenario, 
    prompts,
    open, 
    onOpenChange,
    onSaveSuccess,
    isCreating,
}: { 
    scenario: FullScenario | null, 
    prompts: GetPromptsOutput['prompts'],
    open: boolean, 
    onOpenChange: (open: boolean) => void,
    onSaveSuccess: () => void,
    isCreating: boolean,
}) {
    const [selectedPromptKey, setSelectedPromptKey] = useState('default');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    // Core scenario definition state (for creation)
    const [scenarioId, setScenarioId] = useState('');
    const [scenarioName, setScenarioName] = useState('');
    const [scenarioDescription, setScenarioDescription] = useState('');

    // Time config state
    const [isRepetitionEnabled, setIsRepetitionEnabled] = useState(false);
    const [repetition, setRepetition] = useState<Repetition>('daily');
    const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
    const [startTime, setStartTime] = useState<Date | undefined>();
    const [endTime, setEndTime] = useState<Date | undefined>();
    const [startsAt, setStartsAt] = useState<Date | undefined>();
    const [expiresAt, setExpiresAt] = useState<Date | undefined>();

    const [targetUserRoles, setTargetUserRoles] = useState<TargetUserRoles>({});
    const [ruleLogic, setRuleLogic] = useState<RuleLogic>('and');


    useEffect(() => {
        if(scenario) {
            const isRepEnabled = scenario.repetition && scenario.repetition !== 'none';
            setIsRepetitionEnabled(isRepEnabled);
            setSelectedPromptKey(scenario.configuredPromptKey || 'default');
            setTargetUserRoles(scenario.targetUserRoles || {});
            setRuleLogic(scenario.ruleLogic || 'and');
            
            setScenarioId(scenario.id);
            setScenarioName(scenario.name);
            setScenarioDescription(scenario.description);

            // Repetition Config
            setRepetition(isRepEnabled ? scenario.repetition! : 'daily');
            setDaysOfWeek(scenario.daysOfWeek || []);
            const now = new Date();
            const [startH, startM] = (scenario.startTime || "00:00").split(':').map(Number);
            const [endH, endM] = (scenario.endTime || "23:59").split(':').map(Number);
            setStartTime(new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM));
            setEndTime(new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM));

            // Absolute Time Config
            setStartsAt(scenario.startsAt ? scenario.startsAt.toDate() : undefined);
            setExpiresAt(scenario.expiresAt ? scenario.expiresAt.toDate() : undefined);

        } else { // Reset for new
            setSelectedPromptKey('default');
            setIsRepetitionEnabled(false);
            setRepetition('daily');
            setDaysOfWeek([]);
            setStartTime(undefined);
            setEndTime(undefined);
            setStartsAt(undefined);
            setExpiresAt(undefined);
            setTargetUserRoles({});
            setRuleLogic('and');
            setScenarioId('');
            setScenarioName('');
            setScenarioDescription('');
        }
    }, [scenario]);

    const handleSave = async () => {
        if (isCreating && (!scenarioId || !scenarioName || !scenarioDescription)) {
            toast({
                title: '验证失败',
                description: '新增场景时，ID、名称和描述均为必填项。',
                variant: 'destructive',
            });
            return;
        }

        const finalScenarioId = isCreating ? scenarioId : scenario!.id;
        if (!finalScenarioId) return;

        setIsSaving(true);
        try {
            const scenarioRef = doc(db, 'ai_scenarios', finalScenarioId);
            const dataToSave: Partial<FullScenario> = {
                id: finalScenarioId,
                name: isCreating ? scenarioName : scenario!.name,
                description: isCreating ? scenarioDescription : scenario!.description,
                configuredPromptKey: selectedPromptKey === 'default' ? '' : selectedPromptKey,
                targetUserRoles,
                ruleLogic: ruleLogic,
                repetition: isRepetitionEnabled ? repetition : 'none',
                startsAt: isRepetitionEnabled ? undefined : (startsAt ? Timestamp.fromDate(startsAt) : undefined),
                expiresAt: isRepetitionEnabled ? undefined : (expiresAt ? Timestamp.fromDate(expiresAt) : undefined),
                daysOfWeek: isRepetitionEnabled && repetition === 'weekly' ? daysOfWeek : [],
                startTime: isRepetitionEnabled && startTime ? format(startTime, 'HH:mm') : undefined,
                endTime: isRepetitionEnabled && endTime ? format(endTime, 'HH:mm') : undefined,
            };
            
            const cleanedDataToSave = Object.fromEntries(
                Object.entries(dataToSave).filter(([, value]) => value !== undefined)
            );

            await setDoc(scenarioRef, cleanedDataToSave, { merge: true });
            
            toast({
                title: '保存成功',
                description: `场景“${dataToSave.name}”已成功配置。`,
            });
            onSaveSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save scenario config:", error);
            toast({
                title: '保存失败',
                description: '更新配置时发生错误，请重试。',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRoleToggle = (role: Role) => {
        setTargetUserRoles(prev => {
            const newState = {...prev};
            if (newState[role]) {
                delete newState[role];
            } else {
                newState[role] = []; // Initialize with empty array for ratings
            }
            return newState;
        });
    };
    
    const handleRatingToggle = (role: Role, rating: number) => {
        setTargetUserRoles(prev => {
            const newState = {...prev};
            const currentRatings = newState[role] || [];
            if (currentRatings.includes(rating)) {
                newState[role] = currentRatings.filter(r => r !== rating);
            } else {
                newState[role] = [...currentRatings, rating];
            }
            return newState;
        });
    };

    const handleDayToggle = (day: DayOfWeek) => {
        setDaysOfWeek(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const dialogTitle = isCreating ? '新增功能场景' : `编辑场景: ${scenario?.name}`;
    const dialogDescription = isCreating ? '定义一个新的AI业务场景及其默认配置。' : scenario?.description;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {isCreating && (
                        <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                            <h4 className="font-semibold text-sm">场景定义</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="scenario-id">场景 ID (唯一标识)</Label>
                                    <Input id="scenario-id" value={scenarioId} onChange={(e) => setScenarioId(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="e.g., product-description-generation"/>
                                </div>
                                <div>
                                    <Label htmlFor="scenario-name">场景名称</Label>
                                    <Input id="scenario-name" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="e.g., 商品描述生成"/>
                                </div>
                             </div>
                             <div>
                                <Label htmlFor="scenario-desc">功能描述</Label>
                                <Textarea id="scenario-desc" value={scenarioDescription} onChange={(e) => setScenarioDescription(e.target.value)} placeholder="描述这个场景是做什么的"/>
                             </div>
                        </div>
                    )}
                    <div>
                        <Label htmlFor="prompt-select" className="text-sm font-medium">配置使用的提示词</Label>
                        <Select value={selectedPromptKey} onValueChange={setSelectedPromptKey}>
                            <SelectTrigger id="prompt-select">
                                <div className="flex items-center gap-2">
                                    <Workflow className="w-4 h-4 text-muted-foreground"/>
                                    <SelectValue placeholder="选择一个提示词..." />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">-- (不配置, 使用系统默认行为) --</SelectItem>
                                {prompts.map(p => (
                                    <SelectItem key={p.promptKey} value={p.promptKey}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Accordion type="multiple" className="w-full" defaultValue={['time-config', 'user-config']}>
                        <AccordionItem value="time-config">
                            <AccordionTrigger><div className="flex items-center gap-2"><Clock className="w-4 h-4"/> 时间维度配置</div></AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                <div className="flex items-center space-x-2 p-4 border rounded-md bg-muted/30">
                                    <Checkbox id="enable-repetition" checked={isRepetitionEnabled} onCheckedChange={(checked) => setIsRepetitionEnabled(Boolean(checked))} />
                                    <Label htmlFor="enable-repetition" className="font-medium">启用重复策略</Label>
                                </div>

                                {isRepetitionEnabled ? (
                                    <div className="p-4 border rounded-md space-y-4">
                                        <div className="grid grid-cols-2 gap-4 items-center">
                                            <div>
                                                <Label>重复频率</Label>
                                                <Select value={repetition} onValueChange={(v) => setRepetition(v as Repetition)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="daily">每天</SelectItem>
                                                        <SelectItem value="weekly">每周</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {repetition === 'weekly' && (
                                                <div>
                                                    <Label>选择星期</Label>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                                        {DAYS_OF_WEEK.map(day => (
                                                            <div key={day.id} className="flex items-center space-x-1">
                                                                <Checkbox id={`day-${day.id}`} checked={daysOfWeek.includes(day.id)} onCheckedChange={() => handleDayToggle(day.id)} />
                                                                <Label htmlFor={`day-${day.id}`} className="text-xs font-normal">{day.label}</Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Label>生效时间窗口</Label>
                                            <div className="flex items-center gap-2">
                                                <TimePicker date={startTime} setDate={setStartTime} />
                                                <span>-</span>
                                                <TimePicker date={endTime} setDate={setEndTime} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 border rounded-md space-y-4">
                                        <Label>绝对时间范围 (一次性生效)</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startsAt && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {startsAt ? format(startsAt, "yyyy-MM-dd HH:mm") : <span>选择生效时间</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startsAt} onSelect={setStartsAt} initialFocus/><div className="p-3 border-t border-border"><TimePicker setDate={setStartsAt} date={startsAt} /></div></PopoverContent>
                                            </Popover>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !expiresAt && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {expiresAt ? format(expiresAt, "yyyy-MM-dd HH:mm") : <span>选择失效时间</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expiresAt} onSelect={setExpiresAt} /><div className="p-3 border-t border-border"><TimePicker setDate={setExpiresAt} date={expiresAt} /></div></PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                        
                        <div className="flex items-center justify-center py-2">
                            <RadioGroup value={ruleLogic} onValueChange={(v) => setRuleLogic(v as RuleLogic)} className="flex items-center space-x-4 border p-2 rounded-lg bg-muted/30">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="and" id="logic-and" />
                                    <Label htmlFor="logic-and">同时满足 (与)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="or" id="logic-or" />
                                    <Label htmlFor="logic-or">满足任意一个 (或)</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <AccordionItem value="user-config">
                            <AccordionTrigger><div className="flex items-center gap-2"><Users className="w-4 h-4"/> 用户维度配置</div></AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                                <p className="text-sm text-muted-foreground">限定目标用户。若不勾选任何角色，则默认对所有用户生效。</p>
                                <div className="space-y-3">
                                    {ALL_ROLES.map(role => (
                                        <div key={role} className="p-3 border rounded-md">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id={`role-${role}`} checked={!!targetUserRoles[role]} onCheckedChange={() => handleRoleToggle(role)} />
                                                <Label htmlFor={`role-${role}`} className="text-sm font-medium">{ROLE_NAMES[role]}</Label>
                                            </div>
                                            {targetUserRoles[role] && (
                                                <div className="pt-3 mt-3 border-t">
                                                    <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Star className="w-3 h-3"/> 限定星级 (不选则对该角色所有星级生效)</Label>
                                                     <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                        {Array.from({length: 10}, (_, i) => i + 1).map(rating => (
                                                            <div key={rating} className="flex items-center space-x-1">
                                                                <Checkbox 
                                                                    id={`rating-${role}-${rating}`} 
                                                                    checked={targetUserRoles[role]?.includes(rating)} 
                                                                    onCheckedChange={() => handleRatingToggle(role, rating)}
                                                                />
                                                                <Label htmlFor={`rating-${role}-${rating}`} className="text-xs font-normal">{rating}星</Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        保存配置
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================
export default function AIScenarioConfigPage() {
    const [fullScenarios, setFullScenarios] = useState<FullScenario[]>([]);
    const [prompts, setPrompts] = useState<GetPromptsOutput['prompts']>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedScenario, setSelectedScenario] = useState<FullScenario | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const { role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [scenarioConfigsSnapshot, promptsData] = await Promise.all([
                getDocs(collection(db, 'ai_scenarios')),
                getPrompts()
            ]);

            const dbScenarios: FullScenario[] = [];
            scenarioConfigsSnapshot.forEach(doc => {
                dbScenarios.push(doc.data() as FullScenario);
            });
            
            setPrompts(promptsData.prompts);

            // Robust merging logic: DB scenarios overwrite predefined ones.
            const scenariosMap = new Map<string, FullScenario>();

            // First, add all predefined scenarios.
            PREDEFINED_SCENARIOS.forEach(p => scenariosMap.set(p.id, p));

            // Then, merge/overwrite with scenarios from the database.
            dbScenarios.forEach(dbScenario => {
                scenariosMap.set(dbScenario.id, { ...scenariosMap.get(dbScenario.id), ...dbScenario });
            });

            const combined = Array.from(scenariosMap.values());

            const mergedScenarios = combined.map(scenario => {
                const prompt = promptsData.prompts.find(p => p.promptKey === scenario.configuredPromptKey);
                return {
                    ...scenario,
                    configuredPromptName: prompt?.name,
                };
            });

            setFullScenarios(mergedScenarios);

        } catch (error) {
            console.error("Failed to fetch scenario configuration:", error);
            toast({
                title: "加载失败",
                description: "无法加载场景或提示词数据，请稍后重试。",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!isAuthLoading && role === 'admin') {
            fetchData();
        }
    }, [isAuthLoading, role, fetchData]);

    const handleEditClick = (scenario: FullScenario) => {
        setSelectedScenario(scenario);
        setIsCreating(false);
        setIsDialogOpen(true);
    };

    const handleAddClick = () => {
        setSelectedScenario(null);
        setIsCreating(true);
        setIsDialogOpen(true);
    };
    
    const renderConfigBadge = (scenario: FullScenario) => {
        const parts = [];
        
        let timePart = '';
        if (scenario.repetition && scenario.repetition !== 'none') {
            timePart = '有重复策略';
        } else if (scenario.startsAt || scenario.expiresAt) {
            timePart = '有时间限制';
        }
        if (timePart) parts.push(timePart);

        let userPart = '';
        const roles = scenario.targetUserRoles ? Object.keys(scenario.targetUserRoles) : [];
        if (roles.length > 0) {
            userPart = `${roles.length}个角色`;
            const totalRatings = Object.values(scenario.targetUserRoles!).flat().length;
            if (totalRatings > 0) userPart += `/${totalRatings}个星级`;
        }
        if (userPart) parts.push(userPart);

        if (parts.length > 0) {
            return <Badge variant="outline" className="text-xs ml-2"><Settings2 className="w-3 h-3 mr-1"/>{parts.join(` ${scenario.ruleLogic === 'or' ? '或' : '且'} `)}</Badge>;
        }
        return null;
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
                    <Puzzle />
                    AI 场景配置
                </h1>
                <p className="text-muted-foreground">为平台中不同的AI功能场景，配置默认使用的提示词（Prompt），并可选择性地增加时间或用户限制。</p>
                </header>

                <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">功能场景列表</CardTitle>
                            <CardDescription>
                            以下是平台中所有可配置的AI应用场景。您可以为每个场景指定一个默认的提示词，系统在执行相应功能时将优先使用此配置。
                            </CardDescription>
                        </div>
                        <Button onClick={handleAddClick}>
                            <PlusCircle className="mr-2"/>
                            新增场景
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>AI功能场景</TableHead>
                        <TableHead>当前配置的提示词</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-48 mb-2" /><Skeleton className="h-3 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-36" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            fullScenarios.map((scenario) => (
                                <TableRow key={scenario.id}>
                                    <TableCell>
                                    <div className="font-medium flex items-center">{scenario.name} {renderConfigBadge(scenario)}</div>
                                    <p className="text-xs text-muted-foreground">{scenario.description}</p>
                                    </TableCell>
                                    <TableCell>
                                        {scenario.configuredPromptKey ? (
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="secondary" className="w-fit">
                                                <Workflow className="mr-1.5 h-3 w-3" />
                                                { (prompts.find(p => p.promptKey === scenario.configuredPromptKey))?.name || '未知提示词'}
                                                </Badge>
                                                <p className="font-mono text-xs text-muted-foreground/80">{scenario.configuredPromptKey}</p>
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="w-fit border-dashed">未配置 (使用默认)</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(scenario)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        编辑
                                    </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
                </Card>
            </div>
            
            <ScenarioEditDialog 
                key={selectedScenario?.id || 'new'}
                scenario={selectedScenario}
                prompts={prompts}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSaveSuccess={fetchData}
                isCreating={isCreating}
            />
        </AppLayout>
    );
}

