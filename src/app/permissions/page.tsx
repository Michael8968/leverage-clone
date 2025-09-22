
'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, MoreHorizontal, Star, UserX, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { User, Role } from '@/store/auth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const RoleBadge = ({ role }: { role: Role }) => {
    const roleConfig = {
        admin: { label: '管理员', color: 'bg-red-500 hover:bg-red-600' },
        supplier: { label: '供应商', color: 'bg-blue-500 hover:bg-blue-600' },
        creator: { label: '创意者', color: 'bg-green-500 hover:bg-green-600' },
        user: { label: '普通用户', color: 'bg-gray-500 hover:bg-gray-600' },
    };

    const { label, color } = roleConfig[role] || { label: role, color: 'bg-gray-400' };

    return <Badge className={color}>{label}</Badge>;
};


const StarRating = ({ rating = 0 }: { rating?: number }) => {
    return (
        <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    )
}


export default function PermissionsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

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
                toast({
                    title: '加载失败',
                    description: '无法加载用户列表，请稍后重试。',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, [toast]);


  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8">
        <header>
            <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
                <ShieldCheck />
                权限管理
            </h1>
            <p className="text-muted-foreground">在此处集中管理所有用户的角色、状态和评级。</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">用户列表</CardTitle>
            <CardDescription>查看和编辑平台所有用户的角色和状态。</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>星级</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24" /></div></TableCell>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                            数据库中暂无用户。
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map(user => (
                            <TableRow key={user.uid}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback>{user.name ? user.name.charAt(0) : user.email.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{user.name || '未命名'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                <TableCell>
                                    <RoleBadge role={user.role} />
                                </TableCell>
                                <TableCell>
                                    <StarRating rating={5}/>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="w-4 h-4"/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem disabled>
                                                <UserX className="mr-2"/> 设为暂停
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" disabled>
                                                <Trash2 className="mr-2"/> 删除用户
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
