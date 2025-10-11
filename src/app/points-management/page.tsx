

'use client';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore, type Role } from '@/store/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Coins, Frown, Loader2, Save, PlusCircle, Edit, Trash2, Search, Calendar as CalendarIcon, Mail, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { PointsConfig, PricingRule, PointsTransaction, User, BillingStatement } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type SystemConfig = {
    enable_points: boolean;
    enable_payments: boolean;
    pro_monthly_bonus: number;
    min_balance_for_llm: number;
};

type PricingConfig = {
    points_per_rmb: number;
    min_recharge_rmb: number;
};

type RoleGiftsConfig = {
    [key: string]: number;
};

// Define all LLM actions in the system
const ALL_ACTIONS = [
    'shopping-assistant',
    'ai-match',
    'chat-assistant',
    'intelligent-routing',
    'ai-image-creation',
    'ai-3d-creation',
    'data-analysis'
];

function PricingRuleDialog({ open, onOpenChange, onSave, rule: initialRule }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (rule: PricingRule) => void;
    rule: PricingRule | null;
}) {
    // This is a placeholder for the full rule dialog implementation
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{initialRule ? '编辑定价规则' : '新增定价规则'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        此功能正在开发中。您将能够在这里为特定的时间、用户和场景设置详细的计费规则。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction>保存</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// New Component for Billing and Invoicing
function BillingManagement() {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) {
            toast({ title: '请输入搜索条件', description: '请输入用户的姓名或邮箱进行查询。', variant: 'destructive' });
            return;
        }

        setIsSearching(true);
        setTransactions([]);
        setSelectedUser(null);
        try {
            const usersRef = collection(db, 'users');
            // Allow search by email or name
            const emailQuery = query(usersRef, where('email', '==', searchQuery));
            const nameQuery = query(usersRef, where('name', '==', searchQuery));
            
            const [emailSnapshot, nameSnapshot] = await Promise.all([
                getDocs(emailQuery),
                getDocs(nameQuery),
            ]);

            const userSnapshot = !emailSnapshot.empty ? emailSnapshot : nameSnapshot;

            if (userSnapshot.empty) {
                toast({ title: '未找到用户', description: '未找到匹配该邮箱或姓名的用户。', variant: 'destructive'});
                setIsSearching(false);
                return;
            }

            const user = { ...userSnapshot.docs[0].data(), uid: userSnapshot.docs[0].id } as User;
            setSelectedUser(user);
            
            let transactionsQuery = query(
                collection(db, 'points_transactions'),
                where('uid', '==', user.uid),
                orderBy('timestamp', 'desc')
            );
            
            if (dateRange?.from) {
                transactionsQuery = query(transactionsQuery, where('timestamp', '>=', dateRange.from));
            }
            if (dateRange?.to) {
                transactionsQuery = query(transactionsQuery, where('timestamp', '<=', dateRange.to));
            }

            const transactionsSnapshot = await getDocs(transactionsQuery);
            const transactionsData = transactionsSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            } as PointsTransaction));
            setTransactions(transactionsData);

        } catch (error) {
            console.error(error);
            toast({ title: '查询失败', description: '获取账单明细时发生错误。', variant: 'destructive' });
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleActionClick = (actionType: 'statement' | 'invoice') => {
        toast({
            title: '功能开发中',
            description: `“${actionType === 'statement' ? '发送对账单' : '开具发票'}”功能即将上线，敬请期待。`,
        });
    };
    
    const totalConsumption = transactions.reduce((acc, tx) => tx.amount < 0 ? acc + Math.abs(tx.amount) : acc, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>对账单与发票管理</CardTitle>
                <CardDescription>查询用户的积分消耗明细，并管理对账单和发票。</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-end gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
                    <div className="grid gap-2 flex-1 w-full">
                        <Label htmlFor="user-search">用户邮箱或姓名</Label>
                        <Input id="user-search" placeholder="输入用户邮箱或姓名进行精确查询..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                     <div className="grid gap-2 w-full md:w-auto">
                        <Label htmlFor="date-range">日期范围</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full md:w-[300px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "y-MM-dd")} -{" "}
                                    {format(dateRange.to, "y-MM-dd")}
                                    </>
                                ) : (
                                    format(dateRange.from, "y-MM-dd")
                                )
                                ) : (
                                <span>选择日期范围</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={zhCN}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button type="submit" disabled={isSearching} className="w-full md:w-auto">
                        {isSearching ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
                        查询
                    </Button>
                </form>
                
                {selectedUser && (
                    <div>
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">
                                {selectedUser.name} ({selectedUser.email}) 的账单明细
                            </h3>
                             {transactions.length > 0 && <p className="text-sm text-muted-foreground">范围内总消耗: <span className="font-bold text-red-500">{totalConsumption.toLocaleString()}</span> 积分</p>}
                         </div>
                        <Table>
                            <TableHeader><TableRow><TableHead>类型</TableHead><TableHead>金额</TableHead><TableHead>原因</TableHead><TableHead>时间</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isSearching ? <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow> 
                                : transactions.length === 0 ? <TableRow><TableCell colSpan={4} className="h-24 text-center">在此时间范围内无记录。</TableCell></TableRow> 
                                : transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell><Badge variant="outline">{tx.type}</Badge></TableCell>
                                        <TableCell className={cn(tx.amount > 0 ? "text-green-600" : "text-red-600")}>{tx.amount > 0 ? '+' : ''}{tx.amount}</TableCell>
                                        <TableCell>{tx.reason}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{tx.timestamp ? format(tx.timestamp.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {transactions.length > 0 && (
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => handleActionClick('statement')}><Mail className="mr-2"/>发送对账单</Button>
                                <Button onClick={() => handleActionClick('invoice')}><FileText className="mr-2"/>开具并发票</Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function PointsManagementPage() {
    const { role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();

    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
    const [roleGifts, setRoleGifts] = useState<RoleGiftsConfig | null>(null);
    const [pointsConfig, setPointsConfig] = useState<PointsConfig | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // State for the new dialog
    const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
    const [currentRule, setCurrentRule] = useState<PricingRule | null>(null);
    const [currentAction, setCurrentAction] = useState<string | null>(null);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [systemDoc, pricingDoc, roleGiftsDoc, pointsDoc] = await Promise.all([
                getDoc(doc(db, 'configs', 'system')),
                getDoc(doc(db, 'configs', 'pricing')),
                getDoc(doc(db, 'configs', 'role_gifts')),
                getDoc(doc(db, 'configs', 'points')),
            ]);

            setSystemConfig(systemDoc.exists() ? (systemDoc.data() as SystemConfig) : { enable_points: true, enable_payments: true, pro_monthly_bonus: 10000, min_balance_for_llm: 0 });
            setPricingConfig(pricingDoc.exists() ? (pricingDoc.data() as PricingConfig) : { points_per_rmb: 100, min_recharge_rmb: 10 });
            setRoleGifts(roleGiftsDoc.exists() ? (roleGiftsDoc.data() as RoleGiftsConfig) : { 'user_new': 5000, 'creator_pro': 30000 });
            
            const fetchedPointsConfig = pointsDoc.exists() ? (pointsDoc.data() as PointsConfig) : { defaultPricing: {}, rules: {} };
            
            // Ensure all system actions have a default price
            ALL_ACTIONS.forEach(action => {
                if (!fetchedPointsConfig.defaultPricing.hasOwnProperty(action)) {
                    fetchedPointsConfig.defaultPricing[action] = 1; // Default to 1 point
                }
                 if (!fetchedPointsConfig.rules.hasOwnProperty(action)) {
                    fetchedPointsConfig.rules[action] = []; // Default to empty rules array
                }
            });
            setPointsConfig(fetchedPointsConfig);

        } catch (error) {
            console.error("Failed to fetch points configuration:", error);
            toast({ title: '加载失败', description: '无法加载积分配置，请稍后重试。', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!isAuthLoading && role === 'admin') {
            fetchData();
        }
    }, [isAuthLoading, role, fetchData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await Promise.all([
                setDoc(doc(db, 'configs', 'system'), systemConfig),
                setDoc(doc(db, 'configs', 'pricing'), pricingConfig),
                setDoc(doc(db, 'configs', 'role_gifts'), roleGifts),
                setDoc(doc(db, 'configs', 'points'), pointsConfig),
            ]);
            toast({ title: '保存成功', description: '所有积分和结算配置已更新。' });
        } catch (error) {
            console.error("Failed to save points configuration:", error);
            toast({ title: '保存失败', description: '更新配置时发生错误。', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleRoleGiftChange = (key: string, value: string) => {
        const numValue = parseInt(value, 10);
        if(!isNaN(numValue)) {
            setRoleGifts(prev => ({...prev, [key]: numValue}));
        }
    }
    
    const handleDefaultPriceChange = (action: string, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            setPointsConfig(prev => ({
                ...prev!,
                defaultPricing: { ...prev!.defaultPricing, [action]: numValue }
            }));
        }
    };

    const handleAddRule = (action: string) => {
        setCurrentAction(action);
        setCurrentRule(null);
        setIsRuleDialogOpen(true);
    };

    const handleEditRule = (action: string, rule: PricingRule) => {
        setCurrentAction(action);
        setCurrentRule(rule);
        setIsRuleDialogOpen(true);
    };
    
    const handleDeleteRule = (action: string, ruleId: string) => {
        setPointsConfig(prev => {
            if (!prev) return null;
            const newRulesForAction = (prev.rules[action] || []).filter(r => r.id !== ruleId);
            return {
                ...prev,
                rules: { ...prev.rules, [action]: newRulesForAction }
            };
        });
    };
    
    const handleSaveRule = (rule: PricingRule) => {
        if (!currentAction) return;
        setPointsConfig(prev => {
            if (!prev) return null;
            const rulesForAction = prev.rules[currentAction] || [];
            const existingIndex = rulesForAction.findIndex(r => r.id === rule.id);
            let newRules;
            if (existingIndex > -1) {
                newRules = [...rulesForAction];
                newRules[existingIndex] = rule;
            } else {
                newRules = [...rulesForAction, rule];
            }
            return {
                ...prev,
                rules: { ...prev.rules, [currentAction]: newRules }
            };
        });
    };

    if (isAuthLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }
    
    if (role !== 'admin') {
        return <AppLayout><div className="flex flex-col items-center justify-center h-full p-4 text-center"><Frown className="w-16 h-16 mb-4 text-destructive"/><h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2><p className="text-muted-foreground">此页面仅对管理员开放。</p></div></AppLayout>;
    }

    if (isLoading) {
        return <AppLayout><div className="p-8 space-y-8"><Skeleton className="h-10 w-64"/><Skeleton className="h-4 w-96"/><Skeleton className="h-64 w-full"/></div></AppLayout>;
    }

    return (
        <AppLayout>
            <div className="p-4 md:p-8 space-y-8">
                <header>
                    <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
                        <Coins />
                        积分与结算配置
                    </h1>
                    <p className="text-muted-foreground">管理平台的经济系统，包括积分开关、价格、初始赠送额度等核心参数。</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <Card>
                        <CardHeader>
                            <CardTitle>系统总开关</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <Label htmlFor="enable-points" className="flex flex-col space-y-1">
                                    <span>启用积分系统</span>
                                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                                        关闭后，所有AI调用将不再检查或扣除积分。
                                    </span>
                                </Label>
                                <Switch id="enable-points" checked={systemConfig?.enable_points} onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev!, enable_points: checked }))} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <Label htmlFor="enable-payments" className="flex flex-col space-y-1">
                                    <span>启用支付功能</span>
                                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                                        关闭后，用户将无法看到充值入口。
                                    </span>
                                </Label>
                                <Switch id="enable-payments" checked={systemConfig?.enable_payments} onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev!, enable_payments: checked }))} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>核心参数</CardTitle>
                            <CardDescription>定义积分和充值的基础规则。</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="pro_monthly_bonus">Pro用户每月奖励积分</Label>
                                <Input id="pro_monthly_bonus" type="number" value={systemConfig?.pro_monthly_bonus} onChange={(e) => setSystemConfig(prev => ({...prev!, pro_monthly_bonus: parseInt(e.target.value) || 0}))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min_balance_for_llm">最低积分余额</Label>
                                <Input id="min_balance_for_llm" type="number" value={systemConfig?.min_balance_for_llm} onChange={(e) => setSystemConfig(prev => ({...prev!, min_balance_for_llm: parseInt(e.target.value) || 0}))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="points_per_rmb">每人民币兑换积分</Label>
                                <Input id="points_per_rmb" type="number" value={pricingConfig?.points_per_rmb} onChange={(e) => setPricingConfig(prev => ({...prev!, points_per_rmb: parseInt(e.target.value) || 0}))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min_recharge_rmb">最低充值金额(元)</Label>
                                <Input id="min_recharge_rmb" type="number" value={pricingConfig?.min_recharge_rmb} onChange={(e) => setPricingConfig(prev => ({...prev!, min_recharge_rmb: parseInt(e.target.value) || 0}))} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle>AI服务定价</CardTitle>
                        <CardDescription>为系统中的不同AI功能设置默认的积分消耗值，并可为其添加带有复杂条件的优先计费规则。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Table>
                            <TableHeader><TableRow><TableHead>AI服务 (Action)</TableHead><TableHead>默认成本(积分)</TableHead><TableHead>优先计费规则</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {pointsConfig && ALL_ACTIONS.map((action) => (
                                    <TableRow key={action}>
                                        <TableCell className="font-mono">{action}</TableCell>
                                        <TableCell>
                                            <Input type="number" value={pointsConfig.defaultPricing[action] || 1} className="w-24" onChange={e => handleDefaultPriceChange(action, e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            {(pointsConfig.rules[action] || []).length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {(pointsConfig.rules[action] || []).map(rule => (
                                                        <Button key={rule.id} variant="outline" size="xs" onClick={() => handleEditRule(action, rule)}>
                                                            {rule.name}
                                                        </Button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">无优先规则</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="ghost" size="sm" onClick={() => handleAddRule(action)}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                添加规则
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <BillingManagement />

                 <Card>
                    <CardHeader>
                        <CardTitle>新用户初始赠送积分</CardTitle>
                        <CardDescription>为不同角色和级别的用户设置注册时自动赠送的积分数量。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>角色_级别</TableHead>
                                    <TableHead>赠送积分</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roleGifts && Object.entries(roleGifts).map(([key, value]) => (
                                    <TableRow key={key}>
                                        <TableCell className="font-mono">{key}</TableCell>
                                        <TableCell>
                                            <Input type="number" value={value} className="max-w-xs" onChange={e => handleRoleGiftChange(key, e.target.value)} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                 <div className="flex justify-end mt-8">
                     <Button size="lg" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        保存所有配置
                    </Button>
                </div>
            </div>
            
            <PricingRuleDialog 
                open={isRuleDialogOpen}
                onOpenChange={setIsRuleDialogOpen}
                rule={currentRule}
                onSave={handleSaveRule}
            />
        </AppLayout>
    );
}
