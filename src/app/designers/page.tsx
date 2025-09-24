
'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioTower, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { User } from '@/store/auth';


export default function DesignersPage() {
  const [creators, setCreators] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchCreators() {
      setIsLoading(true);
      try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, where("role", "==", "creator"), where("status", "==", "active"));
        const snapshot = await getDocs(q);
        const creatorsList = snapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User));
        setCreators(creatorsList);
      } catch (error) {
        console.error("Error fetching creators:", error);
        toast({
          title: '加载失败',
          description: '无法加载创意者列表，请稍后重试。',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchCreators();
  }, [toast]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-headline font-bold flex items-center justify-center gap-2"><Users /> 平台创意者</h1>
          <p className="text-muted-foreground mt-2">
            系统将为您推荐在线的创意者。若没有找到合适的服务,可以将您的具体需求发布到需求池。
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Button variant="default">系统推荐</Button>
            <Button variant="outline" onClick={() => router.push('/demand-pool')}>去需求池发布</Button>
          </div>
        </header>

        {isLoading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {creators.map(creator => (
              <Card key={creator.uid} className="text-center flex flex-col">
                <CardHeader className="items-center">
                  <div className="relative">
                    <Image
                      src={creator.avatar}
                      alt={creator.name}
                      width={80}
                      height={80}
                      className="rounded-full"
                    />
                    {creator.status === 'active' && (
                        <Badge variant="default" className="absolute bottom-0 right-0 gap-1 pr-1.5 pl-1 bg-green-500 hover:bg-green-600">
                            <RadioTower className="w-3 h-3 animate-pulse" />
                            在线
                        </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 flex-1">
                  <CardTitle className="font-headline text-xl">{creator.name}</CardTitle>
                  <CardDescription className="h-10 text-xs">一位充满激情的数字艺术家和3D模型设计师。</CardDescription>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {['3D建模', '角色设计', '场景渲染'].map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
                <div className="p-6 pt-2">
                    <Button className="w-full" disabled={creator.status !== 'active'}>立即预约</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
