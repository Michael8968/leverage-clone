

'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState, Suspense } from 'react';
import { useAuthStore } from '@/store/auth';
import type { Role } from '@/store/auth';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Bot,
  LayoutGrid,
  LogOut,
  Building,
  ShieldCheck,
  ChevronDown,
  PenSquare,
  Search,
  Users,
  Wrench,
  Database,
  Library,
  Home,
  Settings,
  Workflow,
  Puzzle,
  CalendarDays,
  Sun, 
  Moon, 
  Laptop,
  Palette,
  Sparkles,
  Route,
  ToggleLeft,
  ToggleRight,
  Power,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Switch } from './ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateUserStatus } from '@/ai/flows/user-management-flows';


interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'AI智能匹配', icon: Home, roles: ['user', 'admin', 'supplier', 'creator'] },
  { href: '/demand-pool', label: '需求池', icon: LayoutGrid, roles: ['admin', 'user', 'supplier', 'creator'] },
  { href: '/designers', label: '创意设计师', icon: Users, roles: ['user', 'admin', 'supplier', 'creator'] },
  { href: '/creator-workbench', label: '创意者工作台', icon: PenSquare, roles: ['creator'] },
  { href: '/search', label: '智能搜索', icon: Search, roles: ['user', 'admin', 'supplier', 'creator'] },
  { href: '/suppliers', label: '供应商中心', icon: Building, roles: ['admin', 'supplier'] },
  { href: '/admin-dashboard', label: 'LLM对接', icon: Settings, roles: ['admin'] },
  { href: '/prompt-management', label: '提示词管理', icon: Workflow, roles: ['admin']},
  { href: '/ai-scenario-config', label: 'AI场景配置', icon: Puzzle, roles: ['admin'] },
  { href: '/intelligent-routing', label: '智能路由策略', icon: Route, roles: ['admin'] },
  { href: '/knowledge-base', label: '知识库管理', icon: Database, roles: ['admin'] },
  { href: '/public-resources', label: '公共资源库', icon: Library, roles: ['admin'] },
  { href: '/permissions', label: '权限管理', icon: ShieldCheck, roles: ['admin'] },
];

function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Palette className="mr-2 h-4 w-4" />
        <span>切换主题</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            <span>明亮</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            <span>暗黑</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("gradient")}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>渐变</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Laptop className="mr-2 h-4 w-4" />
            <span>系统默认</span>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, user, isLoading, logout, setUser } = useAuthStore();
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, mounted, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
      </div>
    );
  }
  
  if (!user || !role) {
    return null; 
  }

  const currentNavItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-headline text-lg font-semibold">Leverage</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {currentNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  onClick={() => router.push(item.href)}
                >
                    <item.icon />
                    <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <div className="flex justify-between items-center w-full">
                    <div className="flex gap-2 items-center">
                        <Avatar className="h-8 w-8 transition-transform duration-300 hover:scale-110">
                            {user?.avatar && <AvatarImage src={user.avatar} />}
                            <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">{user?.name}</span>
                            <span className="text-xs text-muted-foreground">{user?.email}</span>
                        </div>
                    </div>
                    <ChevronDown className="w-4 h-4"/>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ThemeToggle />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="flex-1">
          <header className="flex items-center justify-end p-2 border-b md:hidden">
              <SidebarTrigger/>
          </header>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
