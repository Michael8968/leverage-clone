import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function PermissionsPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-headline font-bold mb-4">权限管理</h1>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">功能正在开发中</CardTitle>
            <CardDescription>此页面用于管理不同角色的权限设置，目前正在建设中。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
              <ShieldCheck className="w-16 h-16 mb-4" />
              <p>精细化的角色权限控制功能即将上线，敬请期待。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
