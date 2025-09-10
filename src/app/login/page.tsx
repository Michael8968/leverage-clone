'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserForRole, useAuthStore, Role } from '@/store/auth';
import { Logo } from '@/components/logo';
import { Users, Building, Bot, PenSquare } from 'lucide-react';
import type { ReactNode } from 'react';

const roleProfiles: { role: Role, name: string, description: string, icon: ReactNode }[] = [
  { role: 'admin', name: '管理员', description: '管理平台所有功能和数据', icon: <Users className="w-8 h-8" /> },
  { role: 'supplier', name: '供应商', description: '管理商品、服务和订单', icon: <Building className="w-8 h-8" /> },
  { role: 'user', name: '普通用户', description: '体验AI购物助手和浏览商品', icon: <Bot className="w-8 h-8" /> },
  { role: 'creator', name: '创作者', description: '参与创意项目和需求匹配', icon: <PenSquare className="w-8 h-8" /> },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleLogin = (role: Role) => {
    const userToLogin = getUserForRole(role);
    login(userToLogin);
    router.push('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2 text-2xl font-headline font-semibold">
        <Logo />
        <h1 className="font-headline">Leverage 力维利治</h1>
      </div>
      <p className="mb-10 text-muted-foreground">请选择一个角色以登录系统</p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {roleProfiles.map(({ role, name, description, icon }) => {
          const user = getUserForRole(role);
          return (
            <Card key={role} className="w-full max-w-sm text-center transform hover:scale-105 transition-transform duration-300 shadow-lg">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {icon}
                </div>
                <CardTitle className="font-headline text-xl">{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Avatar>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <Button onClick={() => handleLogin(role)} className="w-full">
                  以 {name} 身份登录
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
