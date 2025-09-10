
'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, MoreHorizontal, Star, Check, X, UserX, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';


const users = [
    {
        name: '李明 (管理员)',
        email: 'admin@example.com',
        avatar: 'https://picsum.photos/seed/admin/40/40',
        role: '管理员',
        status: '正常',
        rating: 5,
    },
    {
        name: '创新科技 (供应商)',
        email: 'supplier@example.com',
        avatar: 'https://picsum.photos/seed/supplier/40/40',
        role: '供应商',
        status: '待处理',
        rating: 4,
    },
    {
        name: '张伟 (普通用户)',
        email: 'user@example.com',
        avatar: 'https://picsum.photos/seed/user/40/40',
        role: '普通用户',
        status: '正常',
        rating: 3,
    },
    {
        name: '王芳 (创意者)',
        email: 'creator@example.com',
        avatar: 'https://picsum.photos/seed/creator/40/40',
        role: '创意者',
        status: '正常',
        rating: 5,
    },
    {
        name: '问题用户',
        email: 'suspended@example.com',
        avatar: 'https://picsum.photos/seed/suspended/40/40',
        role: '普通用户',
        status: '已暂停',
        rating: 1,
    }
];

const RoleBadge = ({ role, status }: { role: string, status: string }) => {
    const roleColor = () => {
        switch(role) {
            case '管理员': return 'bg-red-500 hover:bg-red-600';
            case '供应商': return 'bg-blue-500 hover:bg-blue-600';
            case '创意者': return 'bg-green-500 hover:bg-green-600';
            case '普通用户': return 'bg-gray-500 hover:bg-gray-600';
            default: return 'bg-gray-500 hover:bg-gray-600';
        }
    };
    
    const statusBadge = () => {
        switch(status) {
            case '正常': return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">{status}</Badge>;
            case '待处理': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">{status}</Badge>;
            case '已暂停':
            case '已停用': 
                return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">{status}</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    }

    return (
        <div className="flex gap-2 items-center">
            <Badge className={roleColor()}>{role}</Badge>
            {statusBadge()}
        </div>
    )
}

const StarRating = ({ rating }: { rating: number }) => {
    return (
        <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    )
}


export default function PermissionsPage() {
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
                        <TableHead>新角色</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map(user => (
                        <TableRow key={user.email}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{user.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                                <RoleBadge role={user.role} status={user.status} />
                            </TableCell>
                            <TableCell>
                                <StarRating rating={user.rating}/>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-[120px] justify-between">
                                            {user.role} <MoreHorizontal className="w-4 h-4 ml-2" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-40">
                                        <DropdownMenuItem>管理员</DropdownMenuItem>
                                        <DropdownMenuItem>供应商</DropdownMenuItem>
                                        <DropdownMenuItem>普通用户</DropdownMenuItem>
                                        <DropdownMenuItem>创意者</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="w-4 h-4"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <Check className="mr-2"/> 保存角色
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem>
                                            <UserX className="mr-2"/> 设为暂停
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <X className="mr-2"/> 加入黑名单
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">
                                            <Trash2 className="mr-2"/> 删除用户
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
