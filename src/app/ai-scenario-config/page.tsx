

'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Puzzle, Edit, Workflow, Loader2, Frown, Users, Clock, Settings2, Calendar as CalendarIcon, Repeat } from 'lucide-react';
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


// =================================================================
// TYPE DEFINITIONS & MOCK DATA
// =================================================================

type Repetition = 'none' | 'monthly' | 'daily' | 'hourly' | 'minutely';

type ScenarioDefinition = {
    id: string;
    name: string;
    description: string;
};

type ScenarioConfig = {
    configuredPromptKey: string;
    repetition?: Repetition;
    startsAt?: Timestamp;
    expiresAt?: Timestamp;
    targetUserRoles?: Role[];
};

type FullScenario = ScenarioDefinition & ScenarioConfig & {
    configuredPromptName?: string;
};

const ALL_SCENARIOS: ScenarioDefinition[] = [
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


// =================================================================
// EDIT DIALOG COMPONENT
// =================================================================
function ScenarioEditDialog({ 
    scenario, 
    prompts,
    open, 
    onOpenChange,
    onSaveSuccess
}: { 
    scenario: FullScenario | null, 
    prompts: GetPromptsOutput['prompts'],
    open: boolean, 
    onOpenChange: (open: boolean) => void,
    onSaveSuccess: () => void
}) {
    const [selectedPromptKey, setSelectedPromptKey] = useState('');
    const [repetition, setRepetition] = useState<Repetition>('none');
    const [startsAt, setStartsAt] = useState<Date | undefined>();
    const [expiresAt, setExpiresAt] = useState<Date | undefined>();
    const [targetUserRoles, setTargetUserRoles] = useState<Role[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [isRepetitionEnabled, setIsRepetitionEnabled] = useState(false);

    useEffect(() => {
        if(scenario) {
            const isRepEnabled = scenario.repetition && scenario.repetition !== 'none';
            setSelectedPromptKey(scenario.configuredPromptKey || 'default');
            setRepetition(isRepEnabled ? scenario.repetition! : 'daily'); // Default to 'daily' if enabled but not set
            setIsRepetitionEnabled(isRepEnabled);
            setStartsAt(scenario.startsAt ? scenario.startsAt.toDate() : undefined);
            setExpiresAt(scenario.expiresAt ? scenario.expiresAt.toDate() : undefined);
            setTargetUserRoles(scenario.targetUserRoles || []);
        } else {
            setSelectedPromptKey('default');
            setRepetition('daily');
            setIsRepetitionEnabled(false);
            setStartsAt(undefined);
            setExpiresAt(undefined);
            setTargetUserRoles([]);
        }
    }, [scenario]);

    const handleSave = async () => {
        if (!scenario) return;
        setIsSaving(true);
        try {
            const scenarioRef = doc(db, 'ai_scenarios', scenario.id);
            const dataToSave: any = {
                name: scenario.name,
                description: scenario.description,
                configuredPromptKey: selectedPromptKey === 'default' ? '' : selectedPromptKey,
                repetition: isRepetitionEnabled ? repetition : 'none',
                startsAt: startsAt ? Timestamp.fromDate(startsAt) : null,
                expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
                targetUserRoles: targetUserRoles,
            };
            
            await setDoc(scenarioRef, dataToSave, { merge: true });
            
            toast({
                title: '保存成功',
                description: `场景“${scenario.name}”已成功配置。`,
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
        setTargetUserRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">编辑场景: {scenario?.name}</DialogTitle>
                    <DialogDescription>{scenario?.description}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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

                    <Accordion type="multiple" className="w-full">
                        <AccordionItem value="time-config">
                            <AccordionTrigger><div className="flex items-center gap-2"><Clock className="w-4 h-4"/> 时间维度配置 (可选)</div></AccordionTrigger>
                            <AccordionContent className="grid grid-cols-2 gap-4 pt-2">
                                <div className="col-span-2 grid grid-cols-2 gap-2 items-end">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="enable-repetition"
                                            checked={isRepetitionEnabled}
                                            onCheckedChange={(checked) => setIsRepetitionEnabled(Boolean(checked))}
                                        />
                                        <Label htmlFor="enable-repetition" className="font-medium">启用重复</Label>
                                    </div>
                                    <Select value={repetition} onValueChange={(v) => setRepetition(v as Repetition)} disabled={!isRepetitionEnabled}>
                                        <SelectTrigger>
                                            <div className="flex items-center gap-2">
                                                <Repeat className="w-4 h-4 text-muted-foreground" />
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">按月重复</SelectItem>
                                            <SelectItem value="daily">按天重复</SelectItem>
                                            <SelectItem value="hourly">按小时重复</SelectItem>
                                            <SelectItem value="minutely">按分钟重复</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2"><Label>绝对时间范围 (对重复策略同样生效)</Label></div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !startsAt && "text-muted-foreground")}>
                                            {startsAt ? format(startsAt, "PPP HH:mm") : <span>生效时间</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startsAt} onSelect={setStartsAt} initialFocus/></PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !expiresAt && "text-muted-foreground")}>
                                            {expiresAt ? format(expiresAt, "PPP HH:mm") : <span>失效时间</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expiresAt} onSelect={setExpiresAt} /></PopoverContent>
                                </Popover>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="user-config">
                            <AccordionTrigger><div className="flex items-center gap-2"><Users className="w-4 h-4"/> 用户维度配置 (可选)</div></AccordionTrigger>
                            <AccordionContent className="pt-4">
                                <Label>限定目标用户角色 (不选则对所有用户生效)</Label>
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    {ALL_ROLES.map(role => (
                                        <div key={role} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`role-${role}`}
                                                checked={targetUserRoles.includes(role)}
                                                onCheckedChange={() => handleRoleToggle(role)}
                                            />
                                            <Label htmlFor={`role-${role}`} className="text-sm font-normal">{ROLE_NAMES[role]}</Label>
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

            const scenarioConfigs: Record<string, ScenarioConfig> = {};
            scenarioConfigsSnapshot.forEach(doc => {
                scenarioConfigs[doc.id] = doc.data() as ScenarioConfig;
            });
            
            setPrompts(promptsData.prompts);

            const mergedScenarios = ALL_SCENARIOS.map(def => {
                const config = scenarioConfigs[def.id] || {};
                const prompt = promptsData.prompts.find(p => p.promptKey === config?.configuredPromptKey);
                return {
                    ...def,
                    ...config,
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
        setIsDialogOpen(true);
    };
    
    const renderConfigBadge = (scenario: FullScenario) => {
        const parts = [];
        if (scenario.targetUserRoles && scenario.targetUserRoles.length > 0) {
            parts.push(`${scenario.targetUserRoles.length}个角色`);
        }
        if (scenario.repetition && scenario.repetition !== 'none') {
            parts.push('有重复策略');
        } else if (scenario.startsAt || scenario.expiresAt) {
            parts.push('有时间限制');
        }
        if (parts.length > 0) {
            return <Badge variant="outline" className="text-xs ml-2"><Settings2 className="w-3 h-3 mr-1"/>{parts.join(', ')}</Badge>;
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
                    <CardTitle className="font-headline">功能场景列表</CardTitle>
                    <CardDescription>
                    以下是平台中所有可配置的AI应用场景。您可以为每个场景指定一个默认的提示词，系统在执行相应功能时将优先使用此配置。
                    </CardDescription>
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
                                    <p className="font-medium flex items-center">{scenario.name} {renderConfigBadge(scenario)}</p>
                                    <p className="text-xs text-muted-foreground">{scenario.description}</p>
                                    </TableCell>
                                    <TableCell>
                                        {scenario.configuredPromptKey ? (
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="secondary" className="w-fit">
                                                <Workflow className="mr-1.5 h-3 w-3" />
                                                {scenario.configuredPromptName || '未知提示词'}
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
                scenario={selectedScenario}
                prompts={prompts}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSaveSuccess={fetchData}
            />
        </AppLayout>
    );
}

    