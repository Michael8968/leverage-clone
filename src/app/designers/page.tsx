

'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, MessageSquare, CalendarPlus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type User } from '@/store/auth';
import { ChatDialog } from '@/components/features/chat-dialog';
import type { Demand, Availability, Appointment } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

function AppointmentDialog({ open, onOpenChange, creator, currentUser }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    creator: User | null;
    currentUser: User | null;
}) {
    const { toast } = useToast();
    const [availability, setAvailability] = useState<Availability | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBooking, setIsBooking] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

    useEffect(() => {
        const fetchAvailability = async () => {
            if (!creator || !open) return;
            setIsLoading(true);
            try {
                const availRef = doc(db, 'availabilities', creator.uid);
                const availSnap = await getDoc(availRef);
                if (availSnap.exists()) {
                    setAvailability(availSnap.data() as Availability);
                } else {
                    setAvailability({ creatorId: creator.uid, slots: [] });
                }
            } catch (error) {
                toast({ title: "加载失败", description: "无法加载创意师的空闲时间。", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchAvailability();
    }, [creator, open, toast]);

    const handleBookAppointment = async () => {
        if (!selectedSlot || !currentUser || !creator) {
            toast({ title: '错误', description: '请选择一个时间段进行预约。' });
            return;
        }
        setIsBooking(true);
        try {
            await addDoc(collection(db, 'appointments'), {
                creatorId: creator.uid,
                requesterId: currentUser.uid,
                requesterName: currentUser.name,
                appointmentTime: selectedSlot,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
             // Also, update the availability to remove the booked slot
            const newSlots = availability?.slots.filter(s => s.seconds !== selectedSlot.seconds);
            await setDoc(doc(db, 'availabilities', creator.uid), { slots: newSlots }, { merge: true });

            toast({ title: '预约成功', description: '您的预约已发送给创意师，请等待对方确认。' });
            onOpenChange(false);
        } catch (error) {
            toast({ title: '预约失败', description: '创建预约时发生错误。', variant: 'destructive' });
        } finally {
            setIsBooking(false);
        }
    };

    const futureSlots = availability?.slots
        ?.filter(slot => slot.toDate() > new Date())
        .sort((a, b) => a.toDate() - b.toDate()) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline">预约 {creator?.name}</DialogTitle>
                    <DialogDescription>请从下方选择一个该创意师的空闲时间段进行预约。</DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-64 overflow-y-auto">
                    {isLoading ? (
                        <Skeleton className="h-24 w-full" />
                    ) : futureSlots.length === 0 ? (
                        <p className="text-center text-muted-foreground">该创意师暂无开放的可预约时间。</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {futureSlots.map((slot: any, index: number) => (
                                <Button
                                    key={index}
                                    variant={selectedSlot?.seconds === slot.seconds ? 'default' : 'outline'}
                                    onClick={() => setSelectedSlot(slot)}
                                >
                                    {format(slot.toDate(), 'M月d日 HH:mm', { locale: zhCN })}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleBookAppointment} disabled={!selectedSlot || isBooking}>
                        {isBooking ? <Loader2 className="animate-spin mr-2" /> : null}
                        确认预约
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function DesignersPage() {
  const [creators, setCreators] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [selectedDemandForChat, setSelectedDemandForChat] = useState<Demand | null>(null);
  const [selectedCreatorForBooking, setSelectedCreatorForBooking] = useState<User | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    async function fetchCreators() {
      setIsLoading(true);
      try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, where("role", "==", "creator"));
        const snapshot = await getDocs(q);
        const creatorsList = snapshot.docs.map(d => ({ ...d.data(), uid: d.id, status: d.data().status || 'active' } as User)); // Default status to 'active' if not set
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
  
  const handleStartChat = async (creator: User) => {
    if (!user) {
      toast({ title: "请先登录", description: "您需要登录后才能与创意师交流。", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (user.uid === creator.uid) {
        toast({ title: "操作无效", description: "您不能与自己发起对话。", variant: "destructive"});
        return;
    }

    try {
        // Create a new demand to act as the context for this chat
        const newDemandData = {
            title: `与创意师 ${creator.name} 的直接沟通`,
            description: `由用户 ${user.name} 主动发起的与创意师 ${creator.name} 的一对一沟通。`,
            budget: 0,
            category: '直接沟通',
            status: '进行中',
            requesterId: user.uid,
            requesterName: user.name,
            requesterAvatar: user.avatar,
            creatorId: creator.uid,
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "demands"), newDemandData);
        
        const demandForChat: Demand = {
            ...newDemandData,
            id: docRef.id,
            createdAt: new Date(),
        };

        setSelectedDemandForChat(demandForChat);
        setIsChatDialogOpen(true);

    } catch (error) {
        console.error("Error creating direct chat demand:", error);
        toast({ title: '发起对话失败', description: '无法创建沟通频道，请稍后重试。', variant: 'destructive'});
    }
  };

  const handleBookAppointment = (creator: User) => {
     if (!user) {
      toast({ title: "请先登录", description: "您需要登录后才能预约。", variant: "destructive" });
      router.push('/login');
      return;
    }
    setSelectedCreatorForBooking(creator);
    setIsAppointmentDialogOpen(true);
  };


  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-headline font-bold flex items-center justify-center gap-2"><Users /> 平台创意者</h1>
          <p className="text-muted-foreground mt-2">
            发现平台上的创意人才。若没有找到合适的服务,可以将您的具体需求发布到需求池。
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
                  <Image
                    src={creator.avatar}
                    alt={creator.name}
                    width={80}
                    height={80}
                    className="rounded-full"
                  />
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
                <div className="p-4 pt-2 grid grid-cols-2 gap-2">
                    <Button 
                        onClick={() => handleStartChat(creator)}
                        disabled={creator.status !== 'active'}
                    >
                        <MessageSquare className="mr-2 h-4 w-4"/>
                        立即交流
                    </Button>
                    <Button variant="outline" onClick={() => handleBookAppointment(creator)}>
                        <CalendarPlus className="mr-2 h-4 w-4"/>
                        立即预约
                    </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

       {selectedDemandForChat && user && (
            <ChatDialog
                open={isChatDialogOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setSelectedDemandForChat(null);
                    setIsChatDialogOpen(isOpen);
                }}
                demand={selectedDemandForChat}
                currentUser={user}
            />
        )}
        <AppointmentDialog
            open={isAppointmentDialogOpen}
            onOpenChange={setIsAppointmentDialogOpen}
            creator={selectedCreatorForBooking}
            currentUser={user}
        />
    </AppLayout>
  );
}
