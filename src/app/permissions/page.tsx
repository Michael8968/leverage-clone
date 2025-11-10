

'use client';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore, type Role } from '@/store/auth';
import type { User, PointsApprovalConfig } from '@/lib/types';
import { ChevronsUpDown, UserCog, ShieldCheck, Star, Ban, Save, Loader2, Users, Frown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { batchUpdateUsers } from '@/ai/flows/user-management-flows';


// =================================================================
// HELPER TYPES AND COMPONENTS
// =================================================================

type SortConfig = { key: keyof User; direction: 'ascending' | 'descending'; };

const ROLE_NAMES: Record<Role, string> = {
    admin: '管理员',
    creator: '创意者',
    supplier: '供应商',
    user: '普通用户',
    guest: '访客',
    suspended: '已禁用',
};

function RestrictedAccess() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Frown className="w-16 h-16 mb-4 text-destructive" />
            <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
            <p className="text-muted-foreground">此页面仅对管理员开放。</p>
        </div>
    );
}

// =================================================================
// APPROVAL CONFIG MANAGER
// =================================================================
function ApprovalConfigManager({ allAdmins, initialConfig }: { allAdmins: User[], initialConfig: PointsApprovalConfig }) {
    const [approver1, setApprover1] = useState(initialConfig.approverUids[0] || '');
    const [approver2, setApprover2] = useState(initialConfig.approverUids[1] || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const availableForApprover2 = allAdmins.filter(admin => admin.uid !== approver1);
    const availableForApprover1 = allAdmins.filter(admin => admin.uid !== approver2);

    const handleSave = async () => {
        if (!approver1 || !approver2) {
            toast({ title: '错误', description: '必须指定两位审批人。', variant: 'destructive' });
            return;
        }
        if (approver1 === approver2) {
            toast({ title: '错误', description: '两位审批人不能是同一个人。', variant: 'destructive' });
            return;
        }
        
        setIsSaving(true);
        try {
            await fetch('/api/configs/points_approval_config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approverUids: [approver1, approver2] }) });
            toast({ title: '成功', description: '赋分审批人已更新。' });
            router.refresh();
        } catch (error) {
            console.error("Error saving approval config:", error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            let friendlyMessage = '更新审批配置失败，请重试。';

            if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
              friendlyMessage = '权限不足：只有管理员可以修改审批配置。';
            } else if (errorMessage.includes('validation') || errorMessage.includes('验证')) {
              friendlyMessage = '数据验证失败：请检查审批人配置是否正确。';
            } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
              friendlyMessage = '网络连接问题：请检查网络连接后重试。';
            } else if (errorMessage.includes('already-exists') || errorMessage.includes('已存在')) {
              friendlyMessage = '配置冲突：该审批配置可能已被其他管理员修改。';
            }

            toast({ title: '保存失败', description: friendlyMessage, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Users /> 赋分审批人配置</CardTitle>
                <CardDescription>指定平台中负责手动赋分审批流程的两位管理员。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>第一审批人</Label>
                        <Select value={approver1} onValueChange={setApprover1}>
                            <SelectTrigger><SelectValue placeholder="选择管理员..." /></SelectTrigger>
                            <SelectContent>
                                {availableForApprover1.map((admin: User) => (
                                    <SelectItem key={admin.uid} value={admin.uid}>{admin.name} ({admin.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>第二审批人</Label>
                        <Select value={approver2} onValueChange={setApprover2}>
                            <SelectTrigger><SelectValue placeholder="选择管理员..." /></SelectTrigger>
                            <SelectContent>
                                {availableForApprover2.map((admin: User) => (
                                    <SelectItem key={admin.uid} value={admin.uid}>{admin.name} ({admin.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={isSaving} className="ml-auto">
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                    保存审批配置
                </Button>
            </CardFooter>
        </Card>
    );
}

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================
export default function PermissionsPage() {
    const { user: currentUser, role, isLoading: isAuthLoading } = useAuthStore();
    const router = useRouter();
    const { toast } = useToast();

    // Data states
    const [users, setUsers] = useState<User[]>([]);
    const [allAdmins, setAllAdmins] = useState<User[]>([]);
    const [approvalConfig, setApprovalConfig] = useState<PointsApprovalConfig>({ approverUids: [] });
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [cursorStack, setCursorStack] = useState<string[]>([]);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [totalUsers, setTotalUsers] = useState(0);
    const [q, setQ] = useState('');

    // UI states
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'role' | 'starLevel' | 'status' | null>(null);
    const [actionValue, setActionValue] = useState<string | number>('');

    // Fetch data on client side
    useEffect(() => {
        if (isAuthLoading) return;
        if (role !== 'admin') return;

        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                // getUsersForAdmin may not be exported in the interim compat layer; fall back to querying users
                let usersData = { users: [] as User[] } as any;
                try {
                    // Some migration steps expose helper functions at runtime; guard with typeof
                    usersData = typeof (globalThis as any).getUsersForAdmin === 'function' ? await (globalThis as any).getUsersForAdmin(null) : { users: [] };
                } catch (e) {
                    console.warn('getUsersForAdmin unavailable, falling back to manual query', e);
                    usersData = { users: [] };
                }

                // fetch users list from server (cursor-based + fuzzy search)
                const cursorParam = cursorStack.length > 0 ? `&cursor=${encodeURIComponent(cursorStack[cursorStack.length - 1])}` : '';
                const usersRes = await fetch(`/api/users?q=${encodeURIComponent(q)}&limit=20${cursorParam}`);
                const usersJson = usersRes.ok ? await usersRes.json() : { items: [], total: 0, nextCursor: undefined };
                const usersList = Array.isArray(usersJson) ? usersJson : usersJson.items || [];
                const usersTotal = usersJson.total || 0;
                const respNextCursor = usersJson.nextCursor;

                // fetch admins via server-side filter
                const adminsRes = await fetch('/api/users?role=admin');
                const adminsJson = adminsRes.ok ? await adminsRes.json() : null;
                const adminsList = adminsJson
                    ? (Array.isArray(adminsJson) ? adminsJson : (adminsJson.items || []))
                    : [];

                // fetch approval config
                const cfgRes = await fetch('/api/configs/points_approval_config');
                const cfgJson = cfgRes.ok ? await cfgRes.json() : null;

                setUsers(usersData.users.length > 0 ? usersData.users : usersList);
                setAllAdmins(adminsList || []);
                setTotalUsers(usersTotal);
                setNextCursor(respNextCursor);
                if (cfgJson && cfgJson.data) {
                    setApprovalConfig(cfgJson.data as PointsApprovalConfig);
                }
            } catch (error) {
                console.error("Error fetching permissions data:", error);
                const errorMessage = error instanceof Error ? error.message : '未知错误';
                let friendlyMessage = '无法获取用户和配置数据，请稍后重试。';

                if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
                  friendlyMessage = '权限不足：无法访问用户管理数据，请联系超级管理员。';
                } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
                  friendlyMessage = '网络连接问题：无法连接到服务器，请检查网络连接。';
                } else if (errorMessage.includes('not-found') || errorMessage.includes('未找到')) {
                  friendlyMessage = '数据服务暂时不可用：用户管理功能暂时无法使用。';
                } else if (errorMessage.includes('quota') || errorMessage.includes('配额')) {
                  friendlyMessage = '服务配额不足：请稍后重试或联系技术支持。';
                }

                toast({ title: '用户数据加载失败', description: friendlyMessage, variant: 'destructive' });
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [isAuthLoading, role, toast, cursorStack, q]);
    
    // Auth check
    useEffect(() => {
        if (!isAuthLoading && !currentUser) {
            router.replace('/login');
        }
    }, [currentUser, isAuthLoading, router]);

    const sortedUsers = useMemo(() => {
        let sortableUsers = [...users];
        if (sortConfig !== null) {
            sortableUsers.sort((a, b) => {
                let aVal: any = a[sortConfig.key];
                let bVal: any = b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableUsers;
    }, [users, sortConfig]);

    const handleSearchChange = (val: string) => {
        setQ(val);
        // reset to first page (clear cursor stack)
        setCursorStack([]);
    };

    const handleSort = (key: keyof User) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedUserIds(checked ? users.map((u: User) => u.uid) : []);
    };

    const handleSelect = (userId: string, checked: boolean) => {
        setSelectedUserIds(prev => checked ? [...prev, userId] : prev.filter(id => id !== userId));
    };

    const openActionModal = (action: 'role' | 'starLevel' | 'status') => {
        setActionValue('');
        setModalAction(action);
        setIsActionModalOpen(true);
    };
    
    const handleBatchUpdate = async () => {
        if (!modalAction || (typeof actionValue !== 'number' && !actionValue) || !currentUser) return;
        
        try {
            let updates: any = {};
            if (modalAction === 'role') updates.role = actionValue as string;
            else if (modalAction === 'starLevel') updates.starLevel = Number(actionValue);
            else if (modalAction === 'status') updates.disabled = actionValue === 'suspended';

            await batchUpdateUsers({
                userIds: selectedUserIds,
                updates: updates,
                currentUserId: currentUser.uid,
            });

            toast({ title: '批量更新成功！', description: `${selectedUserIds.length} 位用户的权限已更新。` });
            
            const newUsers = users.map((u: User) => {
                if (selectedUserIds.includes(u.uid)) {
                    if (updates.role) u.role = updates.role;
                    if (updates.starLevel !== undefined) u.rating = updates.starLevel;
                    if (updates.disabled !== undefined) u.status = updates.disabled ? 'suspended' : 'active';
                }
                return u;
            });
            setUsers(newUsers);
            setSelectedUserIds([]);
            setIsActionModalOpen(false);
            
        } catch (error: any) {
            console.error("Error batch updating users:", error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            let friendlyMessage = '批量更新用户权限失败，请重试。';

            if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
              friendlyMessage = '权限不足：只有管理员可以批量修改用户权限。';
            } else if (errorMessage.includes('validation') || errorMessage.includes('验证')) {
              friendlyMessage = '数据验证失败：请检查输入的用户权限数据是否正确。';
            } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
              friendlyMessage = '网络连接问题：请检查网络连接后重试。';
            } else if (errorMessage.includes('quota') || errorMessage.includes('配额')) {
              friendlyMessage = '操作配额不足：请减少批量操作的数量后重试。';
            } else if (errorMessage.includes('not-found') || errorMessage.includes('未找到')) {
              friendlyMessage = '用户不存在：某些用户可能已被删除，请刷新页面重试。';
            }

            toast({ title: '批量更新失败', description: friendlyMessage, variant: 'destructive' });
        }
    };

    if (isAuthLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (role !== 'admin') {
        return <AppLayout><RestrictedAccess /></AppLayout>;
    }
    
    return (
        <AppLayout>
            <div className="p-4 md:p-8 space-y-8">
                 <header className="mb-8">
                    <h1 className="text-3xl font-headline font-bold">用户与权限管理</h1>
                    <p className="text-muted-foreground mt-2">查看、排序和批量管理平台所有用户，并配置核心审批流程。</p>
                </header>
                
                    {isLoadingData ? <Skeleton className="h-48 w-full"/> : <ApprovalConfigManager allAdmins={allAdmins} initialConfig={approvalConfig} />}

                    <div className="flex items-center gap-3">
                        <Input placeholder="按姓名或邮箱模糊搜索" value={q} onChange={(e) => handleSearchChange(e.target.value)} />
                        <Button onClick={() => setCursorStack([])}>搜索</Button>
                        <div className="ml-auto text-sm text-muted-foreground">共 {totalUsers} 条记录</div>
                    </div>

                <Card>
                    <CardHeader>
                        {selectedUserIds.length > 0 ? (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{selectedUserIds.length} 位用户已选中</span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button><UserCog className="mr-2 h-4 w-4"/>批量操作</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => openActionModal('role')}><ShieldCheck className="mr-2 h-4 w-4"/>更改角色</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => openActionModal('starLevel')}><Star className="mr-2 h-4 w-4"/>评定星级</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => openActionModal('status')}><Ban className="mr-2 h-4 w-4"/>启用/禁用</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ) : (
                            <CardTitle className="font-headline">用户列表</CardTitle>
                        )}
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"><Checkbox checked={selectedUserIds.length > 0 && selectedUserIds.length === users.length} onCheckedChange={handleSelectAll} /></TableHead>
                                    <TableHead>用户</TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('role')}>角色<ChevronsUpDown className="ml-2 h-4 w-4 inline"/></Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => handleSort('rating')}>星级<ChevronsUpDown className="ml-2 h-4 w-4 inline"/></Button></TableHead>
                                    <TableHead>状态</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingData ? Array.from({length: 5}).map((_: any, i: number) => (
                                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>
                                )) : sortedUsers.map((user: User) => (
                                    <TableRow key={user.uid}>
                                        <TableCell><Checkbox checked={selectedUserIds.includes(user.uid)} onCheckedChange={(c) => handleSelect(user.uid, !!c)}/></TableCell>
                                        <TableCell className="font-medium">{user.name} <span className="text-muted-foreground text-xs">{user.email}</span></TableCell>
                                        <TableCell><Badge variant="secondary">{ROLE_NAMES[user.role] || user.role}</Badge></TableCell>
                                        <TableCell>{user.rating ? `${user.rating} 星` : '未评级'}</TableCell>
                                        <TableCell><Badge variant={user.status === 'suspended' ? 'destructive' : 'default'}>{user.status === 'suspended' ? '已禁用' : (user.status === 'active' ? '活跃' : '未知')}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            // go back one step: pop last cursor
                            setCursorStack((stack) => {
                                if (stack.length === 0) return [];
                                return stack.slice(0, stack.length - 1);
                            });
                        }}
                        disabled={cursorStack.length === 0}
                    >上一页</Button>
                    <div className="px-3">第 {cursorStack.length + 1} 页</div>
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (!nextCursor) return;
                            setCursorStack((stack) => [...stack, nextCursor]);
                        }}
                        disabled={!nextCursor}
                    >下一页</Button>
                </div>

                 <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>批量更新 {selectedUserIds.length} 位用户</DialogTitle>
                            <DialogDescription>请选择要应用的新值。</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            {modalAction === 'role' && <Select onValueChange={(v) => setActionValue(v)}><SelectTrigger><SelectValue placeholder="选择新角色..."/></SelectTrigger><SelectContent><SelectItem value="user">普通用户</SelectItem><SelectItem value="creator">创意者</SelectItem><SelectItem value="supplier">供应商</SelectItem><SelectItem value="admin">管理员</SelectItem></SelectContent></Select>}
                            {modalAction === 'starLevel' && <Input type="number" placeholder="输入新的星级 (1-10)" onChange={(e) => setActionValue(e.target.value)} min="1" max="10" />}
                            {modalAction === 'status' && <Select onValueChange={(v) => setActionValue(v)}><SelectTrigger><SelectValue placeholder="选择新状态..."/></SelectTrigger><SelectContent><SelectItem value="active">启用</SelectItem><SelectItem value="suspended">禁用</SelectItem></SelectContent></Select>}
                        </div>
                        <DialogFooter><Button variant="ghost" onClick={() => setIsActionModalOpen(false)}>取消</Button><Button onClick={handleBatchUpdate}>确认更新</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

