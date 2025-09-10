
'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioTower } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Designer = {
  id: string;
  name: string;
  avatar: string;
  description: string;
  tags: string[];
  status: '在线' | '离线';
};

const mockDesigners: Omit<Designer, 'id'>[] = [
    {
        name: 'Alex Chen',
        avatar: 'https://picsum.photos/seed/alex/100/100',
        description: '专注于创造沉浸式赛博朋克世界的资深3D艺术家。',
        tags: ['赛博朋克', '未来主义', '3D角色'],
        status: '在线',
    },
    {
        name: 'Emily Wang',
        avatar: 'https://picsum.photos/seed/emily/100/100',
        description: '擅长用细腻的笔触描绘栩栩如生的动植物和自然景观。',
        tags: ['有机建模', '自然渲染', '写实纹理'],
        status: '在线',
    },
    {
        name: 'David Li',
        avatar: 'https://picsum.photos/seed/david/100/100',
        description: '对复杂的机械结构和科幻载具有着无限的热情和创造力。',
        tags: ['硬表面建模', '科幻载具', '机械设计'],
        status: '离线',
    },
    {
        name: 'Sophia Zhang',
        avatar: 'https://picsum.photos/seed/sophia/100/100',
        description: '将可爱的想象变为现实，创造出温暖人心的角色和玩具。',
        tags: ['可爱模型', '手办原型', '角色设计'],
        status: '在线',
    }
];

async function seedDesigners() {
  try {
    const promises = mockDesigners.map(designer => {
      const docRef = doc(db, 'designers', designer.name.replace(' ', '-').toLowerCase());
      return setDoc(docRef, designer);
    });
    await Promise.all(promises);
    console.log('Designers seeded successfully.');
  } catch (error) {
    console.error('Error seeding designers:', error);
  }
}


export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchDesigners() {
      setIsLoading(true);
      try {
        const designersCollection = collection(db, 'designers');
        const snapshot = await getDocs(designersCollection);
        if (snapshot.empty) {
          await seedDesigners();
          const seededSnapshot = await getDocs(designersCollection);
          const designersList = seededSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Designer));
          setDesigners(designersList);
        } else {
          const designersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Designer));
          setDesigners(designersList);
        }
      } catch (error) {
        console.error("Error fetching designers:", error);
        toast({
          title: '加载失败',
          description: '无法加载设计师列表，请稍后重试。',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchDesigners();
  }, [toast]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-headline font-bold">创意设计师</h1>
          <p className="text-muted-foreground mt-2">
            系统将为您推荐在线的创意设计师,您也可以直接预约他们。若没有找到合适的服务,可以将您的具体需求发布到需求池。
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Button variant="default" disabled>系统推荐</Button>
            <Button variant="outline" onClick={() => router.push('/demand-pool')}>去需求池发布</Button>
          </div>
        </header>

        {isLoading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {designers.map(designer => (
              <Card key={designer.id} className="text-center">
                <CardHeader className="items-center">
                  <div className="relative">
                    <Image
                      src={designer.avatar}
                      alt={designer.name}
                      width={80}
                      height={80}
                      className="rounded-full"
                    />
                    {designer.status === '在线' && (
                        <Badge variant="default" className="absolute bottom-0 right-0 gap-1 pr-1.5 pl-1 bg-green-500 hover:bg-green-600">
                            <RadioTower className="w-3 h-3 animate-pulse" />
                            在线
                        </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <CardTitle className="font-headline text-xl">{designer.name}</CardTitle>
                  <CardDescription className="h-10 text-xs">{designer.description}</CardDescription>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {designer.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
                <div className="p-6 pt-2">
                    <Button className="w-full">立即预约</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

    