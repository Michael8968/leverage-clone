

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { User, Demand } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { MessageSquare, Loader2, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createPrivateDemand } from '@/ai/flows/demand-matching';
import { ChatDialog } from '@/components/features/chat-dialog';

// =================================================================
// Designer Card Component
// =================================================================
function DesignerCard({ designer, onStartChat, onBook }: { designer: User; onStartChat: (designerId: string) => void; onBook: (designerId: string) => void; }) {
    const isOnline = designer.status === 'active';
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                    {designer.avatar && <AvatarImage src={designer.avatar} alt={designer.name} />}
                    <AvatarFallback>{designer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="font-headline">{designer.name}</CardTitle>
                    <CardDescription>{designer.rating ? `${designer.rating} 星设计师` : '新晋设计师'}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{designer.bio || '暂无简介'}</p>
                <div className="flex flex-wrap gap-2">
                    {designer.skills?.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                </div>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2">
                <Button className="w-full" variant={isOnline ? 'default' : 'outline'} disabled={!isOnline} onClick={() => onStartChat(designer.uid)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {isOnline ? '立即交流' : '当前离线'}
                </Button>
                 <Button className="w-full" variant="secondary" onClick={() => onBook(designer.uid)}>
                    <CalendarClock className="mr-2 h-4 w-4" />
                    立即预约
                </Button>
            </CardFooter>
        </Card>
    );
}

// =================================================================
// Main Client Component
// =================================================================
export function DesignersClient({ initialDesigners }: { initialDesigners: User[] }) {
    const [designers] = useState(initialDesigners);
    const [isLoading, setIsLoading] = useState(false);
    const [chatDemand, setChatDemand] = useState<Demand | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const { user } = useAuthStore();
    const { toast } = useToast();

    const handleStartChat = async (creatorId: string) => {
        if (!user) {
            toast({ title: "请先登录", description: "您需要登录后才能与设计师交流。", variant: "destructive" });
            return;
        }
        if (user.uid === creatorId) {
            toast({ title: "提示", description: "您不能与自己发起沟通。" });
            return;
        }

        setIsLoading(true);
        try {
            const { demandId } = await createPrivateDemand({ requesterId: user.uid, creatorId });
            
            const creator = designers.find(d => d.uid === creatorId);

            const tempDemand: Demand = {
                id: demandId,
                requesterId: user.uid,
                creatorId: creatorId,
                title: `与设计师 ${creator?.name || ''} 的专属沟通`,
                description: '',
                budget: 0,
                category: '',
                status: '进行中',
                createdAt: new Date(),
                requesterName: user.name,
                requesterAvatar: user.avatar,
            };
            setChatDemand(tempDemand);
            setIsChatOpen(true);
        } catch (error: any) {
            toast({ title: "发起失败", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleBook = (designerId: string) => {
        toast({
            title: "功能开发中",
            description: "预约功能即将上线，敬请期待！"
        });
    };

    return (
        <div className="p-4 md:p-8">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-headline font-bold">创意设计师</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                    浏览我们的创意设计师社区，找到与您想法产生共鸣的合作伙伴，并发起专属沟通。
                </p>
            </header>

            {isLoading && <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {designers.map(designer => (
                    <DesignerCard key={designer.uid} designer={designer} onStartChat={handleStartChat} onBook={handleBook} />
                ))}
            </div>

            {user && chatDemand && (
                <ChatDialog
                    open={isChatOpen}
                    onOpenChange={setIsChatOpen}
                    demand={chatDemand}
                    currentUser={user}
                />
            )}
        </div>
    );
}
