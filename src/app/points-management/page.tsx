

'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore, type Role } from '@/store/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { Coins, Frown, Loader2, Save, PlusCircle, Edit, Trash2, Search, Calendar as CalendarIcon, Mail, FileText, Settings, Gift, RotateCcw, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useTransition } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { PointsConfig, PricingRule, PointsTransaction, User, BillingStatement, TokenConversionConfig, RoleGiftsConfig } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { TimePicker } from '@/components/ui/time-picker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import { grantPointsToGroup, revokePointsGrant } from '@/ai/flows/user-management-flows';
import { Textarea } from '@/components/ui/textarea';

type SystemConfig = {
    enable_points: boolean;
    enable_payments: boolean;
    pro_monthly_bonus: number;
    min_balance_for_llm: number;
};

const ALL_ACTIONS = [
    'shopping-assistant',
    'ai-match',
    'chat-assistant',
    'intelligent-routing',
    'ai-image-creation',
    'ai-3d-creation',
    'data-analysis'
];

type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAYS_OF_WEEK: { id: DayOfWeek; label: string }[] = [ { id: 'mon', label: '一' }, { id: 'tue', label: '二' }, { id: 'wed', label: '三' }, { id: 'thu', label: '四' }, { id: 'fri', label: '五' }, { id: 'sat', label: '六' }, { id: 'sun', label: '日' } ];
const ALL_ROLES: Role[] = ['admin', 'creator', 'supplier', 'user'];
const ROLE_NAMES: Record<Role, string> = { admin: '管理员', creator: '创意者', supplier: '供应商', user: '普通用户', suspended: '已禁用' };

// This is a pure helper function, moved outside the component.
const getInitialPricingRuleState = (existingRule: PricingRule | null): PricingRule => {
  if (existingRule) {
    return JSON.parse(JSON.stringify(existingRule)); // Deep copy
  }
  return {
    id: `rule_${Date.now()}`,
    name: '',
    priority: 10,
    conditions: { ruleLogic: 'and' },
    action: { type: 'per_call', value: 1 }
  };
};

function PricingRuleDialog({ open, onOpenChange, onSave, rule: initialRule, actionKey }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (rule: PricingRule) => void;
    rule: PricingRule;
    actionKey: string;
}) {
    const { toast } = useToast();
    const [rule, setRule] = useState<PricingRule>(() => getInitialPricingRuleState(initialRule));
    
    const isEditing = !!(rule.id && !rule.id.startsWith('rule_'));
    
    const handleSave = () => {
        if (!rule.name) {
            toast({ title: "信息不完整", description: "规则名称不能为空。", variant: "destructive" });
            return;
        }
        onSave(rule);
    };

    const handleFieldChange = <T extends keyof PricingRule>(field: T, value: PricingRule[T]) => {
        setRule({ ...rule, [field]: value });
    };

    const handleConditionChange = <T extends keyof PricingRule['conditions']>(field: T, value: PricingRule['conditions'][T]) => {
        setRule({ ...rule, conditions: { ...rule.conditions, [field]: value }});
    };

    const handleActionChange = <T extends keyof PricingRule['action']>(field: T, value: PricingRule['action'][T]) => {
        setRule({ ...rule, action: { ...rule.action, [field]: value }});
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
    
    // Since rule is now guaranteed to be a valid object by the parent, this is safe.
    const { conditions, action } = rule;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>{isEditing ? '编辑定价规则' : `为“${actionKey}”新增定价规则`}</AlertDialogTitle>
                    <AlertDialogDescription>
                        为特定的时间、用户和场景设置详细的计费规则。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="rule-name">规则名称</Label>
                            <Input id="rule-name" value={rule.name} onChange={e => handleFieldChange('name', e.target.value)} placeholder="例如：VIP用户优惠" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="rule-priority">优先级 (数字越小越高)</Label>
                            <Input id="rule-priority" type="number" value={rule.priority} onChange={e => handleFieldChange('priority', parseInt(e.target.value) || 10)} />
                        </div>
                    </div>

                    <Accordion type="multiple" className="w-full" defaultValue={['conditions', 'action']}>
                        <AccordionItem value="conditions"><AccordionTrigger>触发条件</AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-4">
                               <Accordion type="multiple" className="w-full">
                                    <AccordionItem value="time"><AccordionTrigger>时间维度</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                            <div className="p-4 border rounded-md space-y-4">
                                                <div className="grid grid-cols-2 gap-4 items-center">
                                                     <div>
                                                        <Label>重复频率</Label>
                                                        <Select value={conditions.repetition || 'none'} onValueChange={(v) => handleConditionChange('repetition', v as any)}>
                                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                                            <SelectContent><SelectItem value="none">不重复</SelectItem><SelectItem value="daily">每天</SelectItem><SelectItem value="weekly">每周</SelectItem></SelectContent>
                                                        </Select>
                                                    </div>
                                                    {conditions.repetition === 'weekly' && (
                                                        <div><Label>选择星期</Label><div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">{DAYS_OF_WEEK.map(day => (<div key={day.id} className="flex items-center space-x-1"><Checkbox id={`day-${day.id}`} checked={conditions.daysOfWeek?.includes(day.id)} onCheckedChange={() => handleDayToggle(day.id)} /><Label htmlFor={`day-${day.id}`} className="text-xs font-normal">{day.label}</Label></div>))}</div></div>
                                                    )}
                                                </div>
                                                 {(conditions.repetition && conditions.repetition !== 'none') && <div><Label>生效时间窗口</Label><div className="flex items-center gap-2"><TimePicker date={conditions.startTime ? new Date(`1970-01-01T${conditions.startTime}`) : undefined} setDate={(d) => handleConditionChange('startTime', d ? format(d, 'HH:mm') : undefined)} /><span>-</span><TimePicker date={conditions.endTime ? new Date(`1970-01-01T${conditions.endTime}`) : undefined} setDate={(d) => handleConditionChange('endTime', d ? format(d, 'HH:mm') : undefined)} /></div></div>}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                     <div className="flex items-center justify-center py-2"><RadioGroup value={conditions.ruleLogic} onValueChange={(v) => handleConditionChange('ruleLogic', v as any)} className="flex items-center space-x-4 border p-2 rounded-lg bg-muted/30"><RadioGroupItem value="and" id="logic-and" /><Label htmlFor="logic-and">同时满足 (与)</Label><RadioGroupItem value="or" id="logic-or" /><Label htmlFor="logic-or">满足任意一个 (或)</Label></RadioGroup></div>
                                    <AccordionItem value="user"><AccordionTrigger>用户维度</AccordionTrigger>
                                        <AccordionContent className="pt-4 space-y-4"><p className="text-sm text-muted-foreground">限定目标用户。若不配置，则对所有用户生效。</p><div className="space-y-3">{ALL_ROLES.map(role => (<div key={role} className="p-3 border rounded-md"><div className="flex items-center space-x-2"><Checkbox id={`role-${role}`} checked={!!conditions.targetUserRoles?.[role]} onCheckedChange={() => handleRoleToggle(role)} /><Label htmlFor={`role-${role}`} className="text-sm font-medium">{ROLE_NAMES[role]}</Label></div>{conditions.targetUserRoles?.[role] && (<div className="pt-3 mt-3 border-t"><Label className="text-xs text-muted-foreground">限定星级 (不选则对该角色所有星级生效)</Label><div className="flex flex-wrap gap-x-3 gap-y-1">{Array.from({length: 10}, (_, i) => i + 1).map(rating => (<div key={rating} className="flex items-center space-x-1"><Checkbox id={`rating-${role}-${rating}`} checked={conditions.targetUserRoles?.[role]?.includes(rating)} onCheckedChange={() => handleRatingToggle(role, rating)}/><Label htmlFor={`rating-${role}-${rating}`} className="text-xs font-normal">{rating}星</Label></div>))}</div></div>)}</div>))}</div></AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="action"><AccordionTrigger>执行动作</AccordionTrigger>
                             <AccordionContent className="pt-4 space-y-4">
                                <RadioGroup value={action.type} onValueChange={v => handleActionChange('type', v as any)} className="grid grid-cols-2 gap-4">
                                    <Label className="flex flex-col gap-2 rounded-lg border p-4 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary"><div className="flex items-center justify-between"><span className="font-semibold">按次计费</span><RadioGroupItem value="per_call"/></div><p className="text-xs text-muted-foreground">每次调用固定扣除积分。</p></Label>
                                    <Label className="flex flex-col gap-2 rounded-lg border p-4 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary"><div className="flex items-center justify-between"><span className="font-semibold">免费</span><RadioGroupItem value="free"/></div><p className="text-xs text-muted-foreground">此条件下调用不扣除积分。</p></Label>
                                    <Label className="flex flex-col gap-2 rounded-lg border p-4 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary"><div className="flex items-center justify-between"><span className="font-semibold">按时计费</span><RadioGroupItem value="per_minute" disabled/></div><p className="text-xs text-muted-foreground">(即将推出) 根据调用时长扣除积分。</p></Label>
                                </RadioGroup>
                                 {(action.type === 'per_call' || action.type === 'add' || action.type === 'subtract') && <div className="space-y-1"><Label>积分值</Label><Input type="number" value={action.value} onChange={e => handleActionChange('value', parseInt(e.target.value) || 0)} /></div>}
                             </AccordionContent>
                         </AccordionItem>
                    </Accordion>
                 </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSave}>保存规则</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

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

function ManualGrantForm({ onSuccessfulGrant }: { onSuccessfulGrant: () => void }) {
    const [targetRoles, setTargetRoles] = useState<Role[]>([]);
    const [targetRatings, setTargetRatings] = useState<number[]>([]);
    const [pointsAmount, setPointsAmount] = useState<number>(1000);
    const [grantReason, setGrantReason] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isGranting, setIsGranting] = useTransition();
    const { toast } = useToast();
    const { user: currentUser, setUser } = useAuthStore();

    const handleRoleToggle = (role: Role) => {
        setTargetRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const handleRatingToggle = (rating: number) => {
        setTargetRatings(prev => prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]);
    };

    const handleExecuteGrant = async () => {
        if (!grantReason || pointsAmount <= 0) {
            toast({ title: "信息不完整", description: "请输入有效的积分数量和操作原因。", variant: "destructive" });
            return;
        }

        setIsConfirmOpen(false);
        setIsGranting(async () => {
            try {
                const result = await grantPointsToGroup({
                    roles: targetRoles,
                    ratings: targetRatings,
                    amount: pointsAmount,
                    reason: grantReason,
                });
                if (result.userCount > 0) {
                    toast({ title: "赋分成功", description: `已成功为 ${result.userCount} 位用户增加了 ${pointsAmount} 积分。` });
                    onSuccessfulGrant();
                    
                    // After a successful grant, refetch the current user's data to update the UI.
                    if (currentUser) {
                        const userDocRef = doc(db, 'users', currentUser.uid);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            setUser(userDocSnap.data() as User, userDocSnap.data().role);
                        }
                    }
                } else {
                    toast({ title: "操作完成", description: "未找到符合条件的用户。", variant: "default" });
                }
            } catch (error: any) {
                toast({ title: "赋分失败", description: error.message, variant: "destructive" });
            }
        });
    };

    const targetDescription = () => {
        let parts = [];
        if (targetRoles.length > 0) parts.push(`角色为 "${targetRoles.map(r => ROLE_NAMES[r] || r).join(', ')}"`);
        if (targetRatings.length > 0) parts.push(`星级为 "${targetRatings.join(', ')}"`);
        return parts.length > 0 ? parts.join(" 且 ") : "所有";
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>手动积分操作</CardTitle>
                    <CardDescription>为特定用户群体批量增加积分，常用于活动奖励、补偿等场景。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label className="font-semibold">第一步: 定义目标用户群 (不选则为全体用户)</Label>
                        <div className="p-3 border rounded-md mt-2 space-y-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">按角色筛选</Label>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                                    {ALL_ROLES.map(role => (<div key={role} className="flex items-center space-x-2"><Checkbox id={`grant-role-${role}`} checked={targetRoles.includes(role)} onCheckedChange={() => handleRoleToggle(role)} /><Label htmlFor={`grant-role-${role}`} className="font-normal">{ROLE_NAMES[role]}</Label></div>))}
                                </div>
                            </div>
                            <div className="pt-3 border-t">
                                <Label className="text-xs text-muted-foreground">按星级筛选</Label>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(rating => (<div key={rating} className="flex items-center space-x-2"><Checkbox id={`grant-rating-${rating}`} checked={targetRatings.includes(rating)} onCheckedChange={() => handleRatingToggle(rating)} /><Label htmlFor={`grant-rating-${rating}`} className="font-normal">{rating}星</Label></div>))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Label className="font-semibold">第二步: 定义操作内容</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="space-y-1"><Label htmlFor="points-amount">增加积分数量</Label><Input id="points-amount" type="number" value={pointsAmount} onChange={e => setPointsAmount(Number(e.target.value))} /></div>
                            <div className="space-y-1"><Label htmlFor="grant-reason">操作原因</Label><Textarea id="grant-reason" placeholder="例如: 2025年春节活动奖励" value={grantReason} onChange={e => setGrantReason(e.target.value)} /></div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full md:w-auto ml-auto" onClick={() => setIsConfirmOpen(true)} disabled={!grantReason || pointsAmount <= 0 || isGranting}>
                        <Gift className="mr-2" />
                        执行赋分
                    </Button>
                </CardFooter>
            </Card>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-amber-500" />二次确认</AlertDialogTitle>
                        <AlertDialogDescription>请检查并确认您的操作。此操作将影响多位用户。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="text-sm space-y-2">
                        <p><strong>目标用户:</strong> {targetDescription()} 用户</p>
                        <p><strong>操作内容:</strong> 为每位用户增加 <strong>{pointsAmount}</strong> 积分</p>
                        <p><strong>操作原因:</strong> {grantReason}</p>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleExecuteGrant} disabled={isGranting}>
                            {isGranting ? <Loader2 className="animate-spin" /> : "确认执行"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function GrantHistory({ refreshKey }: { refreshKey: number }) {
    const [history, setHistory] = useState<PointsTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRevoking, setIsRevoking] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(
                collection(db, 'points_transactions'),
                where('type', '==', 'manual'),
                orderBy('timestamp', 'desc')
            );
            const snapshot = await getDocs(q);
            const uniqueBatches: { [key: string]: PointsTransaction } = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data() as PointsTransaction;
                if (data.batchId && !uniqueBatches[data.batchId]) {
                    uniqueBatches[data.batchId] = data;
                }
            });
            setHistory(Object.values(uniqueBatches));
        } catch (error) {
            console.error("Failed to fetch grant history:", error);
            toast({ title: '加载失败', description: '无法加载手动操作历史。', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory, refreshKey]);

    const handleRevoke = async (batchId: string | undefined) => {
        if (!batchId) return;
        setIsRevoking(batchId);
        try {
            const result = await revokePointsGrant({ batchId });
            toast({ title: '撤销成功', description: `已成功撤销对 ${result.revokedCount} 位用户的赋分操作。` });
            fetchHistory(); // Refresh history
        } catch (error: any) {
            toast({ title: '撤销失败', description: error.message, variant: 'destructive' });
        } finally {
            setIsRevoking(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>近期手动操作历史</CardTitle>
                <CardDescription>此处记录了最近的批量手动赋分操作，您可以对误操作进行紧急撤销。</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>操作原因</TableHead><TableHead>积分</TableHead><TableHead>时间</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>
                         : history.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center h-24">暂无手动操作记录。</TableCell></TableRow>
                         : history.map(tx => (
                            <TableRow key={tx.batchId}>
                                <TableCell>{tx.reason}</TableCell>
                                <TableCell className="font-medium text-green-600">+{tx.amount}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{tx.timestamp ? format(tx.timestamp.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                <TableCell><Badge variant={tx.status === 'revoked' ? 'destructive' : 'default'}>{tx.status === 'revoked' ? '已撤销' : '已生效'}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="destructive" onClick={() => handleRevoke(tx.batchId)} disabled={isRevoking === tx.batchId || tx.status === 'revoked'}>
                                        {isRevoking === tx.batchId ? <Loader2 className="animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                                        紧急撤销
                                    </Button>
                                </TableCell>
                            </TableRow>
                         ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function PointsManagementPage() {
    const { role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();

    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [pricingConfig, setPricingConfig] = useState<TokenConversionConfig | null>(null);
    const [roleGifts, setRoleGifts] = useState<RoleGiftsConfig | null>(null);
    const [pointsConfig, setPointsConfig] = useState<PointsConfig | null>(null);
    const [grantHistoryRefreshKey, setGrantHistoryRefreshKey] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // State for the new dialog (State Elevation)
    const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
    const [currentRule, setCurrentRule] = useState<PricingRule | null>(null);
    const [currentActionKey, setCurrentActionKey] = useState<string>('');


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [systemDoc, pricingDoc, roleGiftsDoc, pointsDoc] = await Promise.all([
                getDoc(doc(db, 'configs', 'system')),
                getDoc(doc(db, 'configs', 'token_conversion')),
                getDoc(doc(db, 'configs', 'role_gifts')),
                getDoc(doc(db, 'configs', 'points')),
            ]);

            setSystemConfig(systemDoc.exists() ? (systemDoc.data() as SystemConfig) : { enable_points: true, enable_payments: true, pro_monthly_bonus: 10000, min_balance_for_llm: 0 });
            setPricingConfig(pricingDoc.exists() ? (pricingDoc.data() as TokenConversionConfig) : { tokens_per_point: 100, actions: {} });
            setRoleGifts(roleGiftsDoc.exists() ? (roleGiftsDoc.data() as RoleGiftsConfig) : { 'user_new': 5000, 'creator_pro': 30000 });
            
            const fetchedPointsConfig = pointsDoc.exists() ? (pointsDoc.data() as PointsConfig) : { defaultPricing: {}, rules: {} };
            
            ALL_ACTIONS.forEach(action => {
                if (!fetchedPointsConfig.defaultPricing.hasOwnProperty(action)) {
                    fetchedPointsConfig.defaultPricing[action] = 1; 
                }
                 if (!fetchedPointsConfig.rules.hasOwnProperty(action)) {
                    fetchedPointsConfig.rules[action] = []; 
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
                setDoc(doc(db, 'configs', 'token_conversion'), pricingConfig),
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
    
    const handleTokenConfigChange = (type: 'tokens_per_point' | string, value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;
        setPricingConfig(prev => {
            if (!prev) return null;
            if (type === 'tokens_per_point') {
                return { ...prev, tokens_per_point: numValue };
            }
            return { ...prev, actions: { ...(prev.actions || {}), [type]: numValue } };
        });
    };

    const handleAddRule = (action: string) => {
        setCurrentActionKey(action);
        setCurrentRule(getInitialPricingRuleState(null));
        setIsRuleDialogOpen(true);
    };

    const handleEditRule = (action: string, rule: PricingRule) => {
        setCurrentActionKey(action);
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
    
    const handleSaveRule = (ruleToSave: PricingRule) => {
        setPointsConfig(prev => {
            if (!prev) return null;
            const rulesForAction = prev.rules[currentActionKey] || [];
            const existingIndex = rulesForAction.findIndex(r => r.id === ruleToSave.id);
            let newRules;
            if (existingIndex > -1) {
                newRules = [...rulesForAction];
                newRules[existingIndex] = ruleToSave;
            } else {
                newRules = [...rulesForAction, ruleToSave];
            }
            return {
                ...prev,
                rules: { ...prev.rules, [currentActionKey]: newRules }
            };
        });
        setIsRuleDialogOpen(false);
        setCurrentRule(null);
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
                    <div className="grid grid-cols-1 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>核心参数</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="pro_monthly_bonus">Pro用户每月奖励积分</Label>
                                    <Input id="pro_monthly_bonus" type="number" value={systemConfig?.pro_monthly_bonus} onChange={(e) => setSystemConfig(prev => ({...prev!, pro_monthly_bonus: parseInt(e.target.value) || 0}))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="min_balance_for_llm">最低积分余额</Label>
                                    <Input id="min_balance_for_llm" type="number" value={systemConfig?.min_balance_for_llm} onChange={(e) => setSystemConfig(prev => ({...prev!, min_balance_for_llm: parseInt(e.target.value) || 0}))} />
                                </div>
                            </CardContent>
                        </Card>
                        
                    </div>
                 </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <Card>
                        <CardHeader>
                            <CardTitle>新用户初始赠送积分</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>角色_级别</TableHead><TableHead>赠送积分</TableHead></TableRow></TableHeader>
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
                    <ManualGrantForm onSuccessfulGrant={() => setGrantHistoryRefreshKey(k => k + 1)} />
                </div>
                <GrantHistory refreshKey={grantHistoryRefreshKey} />
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
                                            <Input type="number" value={pointsConfig.defaultPricing[action] ?? 1} className="w-24" onChange={e => handleDefaultPriceChange(action, e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            {(pointsConfig.rules[action] || []).length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {(pointsConfig.rules[action] || []).map(rule => (
                                                        <Button key={rule.id} variant="outline" size="xs" onClick={() => handleEditRule(action, rule)}>
                                                            <Settings className="mr-1 h-3 w-3" /> {rule.name}
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

                 <div className="flex justify-end mt-8">
                     <Button size="lg" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        保存所有配置
                    </Button>
                </div>
            </div>
            
            {isRuleDialogOpen && currentRule && (
              <PricingRuleDialog 
                  key={currentRule.id}
                  open={isRuleDialogOpen}
                  onOpenChange={setIsRuleDialogOpen}
                  rule={currentRule}
                  onSave={handleSaveRule}
                  actionKey={currentActionKey}
              />
            )}
        </AppLayout>
    );
}
