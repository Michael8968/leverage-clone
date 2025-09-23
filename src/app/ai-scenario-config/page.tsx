

'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Puzzle, Edit, Workflow, Loader2, Frown } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getPrompts, type GetPromptsOutput } from '@/ai/flows/admin-management-flows';
import { Skeleton } from '@/components/ui/skeleton';

// =================================================================
// TYPE DEFINITIONS & MOCK DATA
// =================================================================

type ScenarioDefinition = {
    id: string;
    name: string;
    description: string;
};

type ScenarioConfig = {
    configuredPromptKey: string;
    // other fields if any in the future
};

type FullScenario = ScenarioDefinition & {
    configuredPromptKey?: string;
    configuredPromptName?: string;
};

// This is the single source of truth for all configurable scenarios in the platform.
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
    const [selectedPromptKey, setSelectedPromptKey] = useState(scenario?.configuredPromptKey || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setSelectedPromptKey(scenario?.configuredPromptKey || '');
    }, [scenario]);

    const handleSave = async () => {
        if (!scenario) return;
        setIsSaving(true);
        try {
            const scenarioRef = doc(db, 'ai_scenarios', scenario.id);
            await setDoc(scenarioRef, { 
                configuredPromptKey: selectedPromptKey,
                name: scenario.name,
                description: scenario.description,
            }, { merge: true });
            
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
    
    const handleSelectChange = (value: string) => {
        // If user selects the "default" option, set state to empty string
        // otherwise use the selected promptKey.
        setSelectedPromptKey(value === 'default' ? '' : value);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline">编辑场景: {scenario?.name}</DialogTitle>
                    <DialogDescription>{scenario?.description}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <label htmlFor="prompt-select" className="text-sm font-medium">配置使用的提示词</label>
                    <Select value={selectedPromptKey || 'default'} onValueChange={handleSelectChange}>
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
                const config = scenarioConfigs[def.id];
                const prompt = promptsData.prompts.find(p => p.promptKey === config?.configuredPromptKey);
                return {
                    ...def,
                    configuredPromptKey: config?.configuredPromptKey,
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
                <p className="text-muted-foreground">为平台中不同的AI功能场景，配置默认使用的提示词（Prompt）。</p>
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
                                    <p className="font-medium">{scenario.name}</p>
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
