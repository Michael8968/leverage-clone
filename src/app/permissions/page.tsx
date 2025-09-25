
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { Frown, Loader2, ChevronsUpDown, UserCog, ShieldCheck, Star, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { batchUpdateUsers } from '@/ai/flows/user-management-flows';

type SortConfig = { key: keyof User; direction: 'ascending' | 'descending'; };

export default function PermissionsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'role' | 'starLevel' | 'status' | null>(null);
    const [actionValue, setActionValue] = useState<string | number>('');

    const { user: currentUser } = useAuthStore();
    const { toast } = useToast();

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const usersSnapshot = await getDocs(query(collection(db, 'users')));
            setUsers(usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }) as User));
        } catch (error) { toast({ title: '加载失败', variant: 'destructive' }); }
        finally { setIsLoading(false); }
    }, [toast]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const sortedUsers = useMemo(() => {
        let sortableUsers = [...users];
        if (sortConfig !== null) {
            sortableUsers.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableUsers;
    }, [users, sortConfig]);

    const handleSort = (key: keyof User) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleSelectAll = (checked: boolean) => { setSelectedUserIds(checked ? users.map(u => u.uid) : []); };
    const handleSelect = (userId: string, checked: boolean) => { setSelectedUserIds(prev => checked ? [...prev, userId] : prev.filter(id => id !== userId)); };

    const openActionModal = (action: 'role' | 'starLevel' | 'status') => {
        setModalAction(action);
        setIsActionModalOpen(true);
    };

    const handleBatchUpdate = async () => {
        if (!modalAction || !actionValue || !currentUser) return;
        try {
            const updates = modalAction === 'role' ? { role: actionValue }
                          : modalAction === 'starLevel' ? { starLevel: Number(actionValue) }
                          : { disabled: actionValue === 'disable' };
                          
            await batchUpdateUsers({ userIds: selectedUserIds, updates, currentUserId: currentUser.uid });
            toast({ title: '批量更新成功！' });
            fetchUsers();
            setSelectedUserIds([]);
            setIsActionModalOpen(false);
        } catch (error: any) {
            toast({ title: '更新失败', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <AppLayout>
            <div className="p-4 md:p-8">
                <header className="mb-8"><h1 className="text-3xl font-headline font-bold">用户管理</h1><p className="text-muted-foreground mt-2">查看、排序和批量管理平台所有用户。</p></header>
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
                    <CardContent><Table><TableHeader><TableRow>
                        <TableHead className="w-[50px]"><Checkbox checked={selectedUserIds.length > 0 && selectedUserIds.length === users.length} onCheckedChange={handleSelectAll} /></TableHead>
                        <TableHead>用户</TableHead>
                        <TableHead><Button variant="ghost" onClick={() => handleSort('role')}>角色<ChevronsUpDown className="ml-2 h-4 w-4 inline"/></Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => handleSort('starLevel')}>星级<ChevronsUpDown className="ml-2 h-4 w-4 inline"/></Button></TableHead>
                        <TableHead>状态</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-20 w-full"/></TableCell></TableRow>
                        : sortedUsers.map(user => (
                            <TableRow key={user.uid}>
                                <TableCell><Checkbox checked={selectedUserIds.includes(user.uid)} onCheckedChange={(c) => handleSelect(user.uid, !!c)}/></TableCell>
                                <TableCell className="font-medium">{user.name} <span className="text-muted-foreground text-xs">{user.email}</span></TableCell>
                                <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                <TableCell>{user.starLevel ? `${user.starLevel} 星` : '未评级'}</TableCell>
                                <TableCell><Badge variant={user.disabled ? 'destructive' : 'default'}>{user.disabled ? '已禁用' : '活跃'}</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    </Table></CardContent>
                </Card>
            </div>

            <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>批量更新 {selectedUserIds.length} 位用户</DialogTitle><DialogDescription>请选择要应用的新值。</DialogDescription></DialogHeader>
                    <div className="py-4">
                        {modalAction === 'role' && <Select onValueChange={(v) => setActionValue(v)}><SelectTrigger><SelectValue placeholder="选择新角色..."/></SelectTrigger><SelectContent><SelectItem value="user">普通用户</SelectItem><SelectItem value="creator">创意者</SelectItem><SelectItem value="supplier">供应商</SelectItem><SelectItem value="admin">管理员</SelectItem></SelectContent></Select>}
                        {modalAction === 'starLevel' && <Select onValueChange={(v) => setActionValue(v)}><SelectTrigger><SelectValue placeholder="选择新星级..."/></SelectTrigger><SelectContent>{Array.from({length:10},(_,i)=>i+1).map(s=><SelectItem key={s} value={String(s)}>{s} 星</SelectItem>)}</SelectContent></Select>}
                        {modalAction === 'status' && <Select onValueChange={(v) => setActionValue(v)}><SelectTrigger><SelectValue placeholder="选择新状态..."/></SelectTrigger><SelectContent><SelectItem value="enable">启用</SelectItem><SelectItem value="disable">禁用</SelectItem></SelectContent></Select>}
                    </div>
                    <DialogFooter><Button variant="ghost" onClick={() => setIsActionModalOpen(false)}>取消</Button><Button onClick={handleBatchUpdate}>确认更新</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

