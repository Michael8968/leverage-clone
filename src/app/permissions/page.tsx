

'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, MoreHorizontal, Star, UserX, Trash2, UserCog, UserCheck, CircleSlash, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { useAuthStore, type User, type Role } from '@/store/auth';
import { useEffect, useState, useTransition, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';


// RoleBadge remains the same
const RoleBadge = ({ role }: { role: Role }) => {
    const roleConfig = {
        admin: { label: '管理员', color: 'bg-red-500 hover:bg-red-600' },
        supplier: { label: '供应商', color: 'bg-blue-500 hover:bg-blue-600' },
        creator: { label: '创意者', color: 'bg-green-500 hover:bg-green-600' },
        user: { label: '普通用户', color: 'bg-gray-500 hover:bg-gray-600' },
        suspended: { label: '已禁用', color: 'bg-yellow-500 hover:bg-yellow-600'},
    };
    const { label, color } = roleConfig[role] || { label: role, color: 'bg-gray-400' };
    return <Badge className={cn(color, 'text-white')}>{label}</Badge>;
};

// StarRating component now takes an optional onClick handler for interactivity
const StarRating = ({ rating = 0, onSetRating }: { rating?: number; onSetRating?: (rating: number) => void; }) => {
    const totalStars = 10;
    return (
        <div className="flex items-center">
            {Array.from({ length: totalStars }).map((_, i) => (
                <Star 
                    key={i} 
                    className={cn(
                        "w-4 h-4",
                        i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300',
                        onSetRating && 'cursor-pointer hover:scale-125 transition-transform'
                    )}
                    onClick={onSetRating ? () => onSetRating(i + 1) : undefined}
                />
            ))}
        </div>
    );
};


// UserActionsCell updated to include rating management
function UserActionsCell({ 
    user, 
    onUserUpdate,
    onConfirmDelete 
}: { 
    user: User; 
    onUserUpdate: (updatedUser: User) => void;
    onConfirmDelete: (user: User) => void;
}) {
    const { user: currentUser } = useAuthStore();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const isSelf = currentUser?.uid === user.uid;

    const updateUserData = async (data: Partial<User>) => {
        startTransition(async () => {
            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, data);
                onUserUpdate({ ...user, ...data });
                toast({ title: "成功", description: `用户 ${user.name} 的信息已更新。` });
            } catch (error) {
                console.error("Failed to update user:", error);
                toast({ title: "失败", description: "更新用户信息时发生错误。", variant: "destructive" });
            }
        });
    };

    const handleChangeRole = (newRole: Role) => {
        if (isSelf) {
            toast({ title: "操作无效", description: "您不能更改自己的角色。", variant: "destructive" });
            return;
        }
        updateUserData({ role: newRole });
    };
    
    const handleSetRating = (newRating: number) => {
        updateUserData({ rating: newRating });
    };
    
    const handleToggleSuspend = () => {
        const currentStatus = user.status || 'active';
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        updateUserData({ status: newStatus });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isPending}>
                    <MoreHorizontal className="w-4 h-4"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger disabled={isSelf || isPending}>
                        <UserCog className="mr-2"/> 更改角色为...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            {(['admin', 'supplier', 'creator', 'user'] as Role[]).map(role => (
                                <DropdownMenuItem key={role} onClick={() => handleChangeRole(role)} disabled={user.role === role}>
                                    <RoleBadge role={role} />
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger disabled={isPending}>
                        <Star className="mr-2" /> 评定星级...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                           {Array.from({ length: 10 }).map((_, i) => (
                                <DropdownMenuItem key={i} onClick={() => handleSetRating(i + 1)}>
                                    <StarRating rating={i + 1}/>
                                </DropdownMenuItem>
                            ))}
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => handleSetRating(0)}>
                                清除星级
                             </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleToggleSuspend} disabled={isSelf || isPending}>
                    {user.status === 'suspended' ? <UserCheck className="mr-2"/> : <UserX className="mr-2"/>}
                    {user.status === 'suspended' ? '恢复用户' : '设为暂停'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" disabled={isSelf || isPending} onClick={() => onConfirmDelete(user)}>
                    <Trash2 className="mr-2"/> 删除用户
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function BulkActionsBar({
  selectedUserIds,
  users,
  onBulkUpdate,
}: {
  selectedUserIds: string[];
  users: User[];
  onBulkUpdate: (updatedUsers: User[]) => void;
}) {
  const { toast } = useToast();

  const handleBulkUpdate = async (updateData: Partial<User>) => {
    try {
      const batch = writeBatch(db);
      selectedUserIds.forEach((uid) => {
        const userRef = doc(db, 'users', uid);
        batch.update(userRef, updateData);
      });
      await batch.commit();

      const updatedUsers = users.map(user => 
        selectedUserIds.includes(user.uid) ? { ...user, ...updateData } : user
      );
      onBulkUpdate(updatedUsers);

      toast({
        title: "批量操作成功",
        description: `已成功更新 ${selectedUserIds.length} 个用户。`,
      });
    } catch (error) {
      console.error("Bulk update failed:", error);
      toast({
        title: "批量操作失败",
        description: "更新用户信息时发生错误。",
        variant: "destructive",
      });
    }
  };

  const handleChangeRole = (role: Role) => handleBulkUpdate({ role });
  const handleSetRating = (rating: number) => handleBulkUpdate({ rating });
  const handleSuspend = () => handleBulkUpdate({ status: "suspended" });

  return (
    <div className="flex h-12 items-center justify-between rounded-md border bg-muted px-4">
      <p className="text-sm font-medium">已选中 {selectedUserIds.length} 个用户</p>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><UserCog className="mr-2"/>更改角色</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {(['admin', 'supplier', 'creator', 'user'] as Role[]).map(role => (
                <DropdownMenuItem key={role} onClick={() => handleChangeRole(role)}>
                    <RoleBadge role={role} />
                </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Star className="mr-2"/>评定星级</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
             {Array.from({ length: 10 }).map((_, i) => (
                <DropdownMenuItem key={i} onClick={() => handleSetRating(i + 1)}>
                    <StarRating rating={i + 1}/>
                </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSetRating(0)}>
                清除星级
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="destructive-outline" size="sm" onClick={handleSuspend}>
          <UserX className="mr-2"/>
          禁用
        </Button>
      </div>
    </div>
  );
}


export default function PermissionsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const { toast } = useToast();

    const activeUsers = useMemo(() => users.filter(u => u.role !== 'suspended'), [users]);
    const isAllSelected = activeUsers.length > 0 && selectedUserIds.length === activeUsers.length;


    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const usersCollection = collection(db, 'users');
                const q = query(usersCollection, orderBy('email'));
                const usersSnapshot = await getDocs(q);
                const usersList = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
                setUsers(usersList);
            } catch (error) {
                console.error("Error fetching users:", error);
                toast({ title: '加载失败', description: '无法加载用户列表，请稍后重试。', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, [toast]);
    
    const handleUserUpdate = (updatedUser: User) => {
        setUsers(currentUsers => 
            currentUsers.map(u => u.uid === updatedUser.uid ? updatedUser : u)
        );
    };

    const handleBulkUpdate = (updatedUsers: User[]) => {
      setUsers(updatedUsers);
      setSelectedUserIds([]); // Clear selection after bulk action
    };

    const handleConfirmDelete = (user: User) => {
        setUserToDelete(user);
    };

    const executeDelete = async () => {
        if (!userToDelete) return;

        try {
            const userRef = doc(db, 'users', userToDelete.uid);
            await updateDoc(userRef, { role: 'suspended', status: 'suspended' });
            handleUserUpdate({ ...userToDelete, role: 'suspended', status: 'suspended' });
            toast({ title: "用户已禁用", description: `用户 ${userToDelete.name} 已被软删除并禁用。` });
        } catch (error) {
             console.error("Failed to 'soft delete' user:", error);
             toast({ title: "操作失败", description: "禁用用户时发生错误。", variant: "destructive" });
        } finally {
            setUserToDelete(null);
        }
    };
    
    const handleSelectAll = (checked: boolean) => {
      setSelectedUserIds(checked ? activeUsers.map(u => u.uid) : []);
    };

    const handleRowSelect = (uid: string, checked: boolean) => {
      setSelectedUserIds(prev => 
        checked ? [...prev, uid] : prev.filter(id => id !== uid)
      );
    };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8">
        <header>
            <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
                <ShieldCheck />权限管理
            </h1>
            <p className="text-muted-foreground">在此处集中管理所有用户的角色、状态和评级。</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">用户列表</CardTitle>
            <CardDescription>查看和编辑平台所有用户的角色和状态。</CardDescription>
             {selectedUserIds.length > 0 && (
                <BulkActionsBar 
                  selectedUserIds={selectedUserIds} 
                  users={users} 
                  onBulkUpdate={handleBulkUpdate}
                />
            )}
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
                            <Checkbox 
                                onCheckedChange={handleSelectAll}
                                checked={isAllSelected}
                                aria-label="Select all"
                            />
                        </TableHead>
                        <TableHead>用户</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>星级 (1-10)</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : activeUsers.map(user => (
                        <TableRow 
                            key={user.uid} 
                            className={cn(user.status === 'suspended' && 'opacity-50')}
                            data-state={selectedUserIds.includes(user.uid) && "selected"}
                        >
                             <TableCell>
                                <Checkbox
                                    checked={selectedUserIds.includes(user.uid)}
                                    onCheckedChange={(checked) => handleRowSelect(user.uid, !!checked)}
                                    aria-label={`Select user ${user.name}`}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{user.name ? user.name.charAt(0) : user.email.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className='flex flex-col'>
                                      <span className="font-medium">{user.name || '未命名'}</span>
                                      {user.status === 'suspended' && <Badge variant="destructive" className="w-fit text-xs gap-1"><CircleSlash className="w-3 h-3"/>已暂停</Badge>}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell><RoleBadge role={user.role} /></TableCell>
                            <TableCell><StarRating rating={user.rating}/></TableCell>
                            <TableCell className="text-right">
                                <UserActionsCell 
                                  user={user} 
                                  onUserUpdate={handleUserUpdate}
                                  onConfirmDelete={handleConfirmDelete}
                                 />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>确认“删除”用户</AlertDialogTitle>
                <AlertDialogDescription>
                    为保证数据安全，此操作会将用户 “{userToDelete?.name}” 的角色设为“已禁用”，使其无法登录。用户数据仍会保留。您确定吗？
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">确认禁用</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </AppLayout>
  );
}
