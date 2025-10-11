
'use client';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Coins, Frown, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function PointsManagementPage() {
    const { role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();

    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
    const [roleGifts, setRoleGifts] = useState<RoleGiftsConfig | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [systemDoc, pricingDoc, roleGiftsDoc] = await Promise.all([
                getDoc(doc(db, 'configs', 'system')),
                getDoc(doc(db, 'configs', 'pricing')),
                getDoc(doc(db, 'configs', 'role_gifts')),
            ]);

            setSystemConfig(systemDoc.exists() ? (systemDoc.data() as SystemConfig) : { enable_points: true, enable_payments: true, pro_monthly_bonus: 10000, min_balance_for_llm: 0 });
            setPricingConfig(pricingDoc.exists() ? (pricingDoc.data() as PricingConfig) : { points_per_rmb: 100, min_recharge_rmb: 10 });
            setRoleGifts(roleGiftsDoc.exists() ? (roleGiftsDoc.data() as RoleGiftsConfig) : { 'user_new': 5000, 'creator_pro': 30000 });

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
            ]);
            toast({ title: '保存成功', description: '所有积分和支付配置已更新。' });
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
                        积分与支付配置
                    </h1>
                    <p className="text-muted-foreground">管理平台的经济系统，包括积分开关、价格、初始赠送额度等核心参数。</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>系统总开关</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
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

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>核心参数</CardTitle>
                            <CardDescription>定义积分和充值的基础规则。</CardDescription>
                        </CardHeader>
                         <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    <Card className="md:col-span-2 lg:col-span-3">
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

                </div>

                 <div className="flex justify-end mt-8">
                     <Button size="lg" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        保存所有配置
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
