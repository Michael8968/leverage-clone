

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { User, Demand } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { MessageSquare, Loader2, CalendarClock, Bot, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createPrivateDemand } from '@/ai/flows/demand-matching';
import { ChatDialog } from '@/components/features/chat-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// =================================================================
// Designer Card Component
// =================================================================
function DesignerCard({ designer, onStartChat, onBook }: { designer: User; onStartChat: (designer: User) => void; onBook: (designerId: string) => void; }) {
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
                <Button className="w-full" variant={isOnline ? 'default' : 'outline'} onClick={() => onStartChat(designer)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {isOnline ? '立即交流' : '发起交流'}
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
// Communication Dialog Component
// =================================================================
function CommunicationDialog({
    open,
    onOpenChange,
    designer,
    onConfirm,
    isLoading,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    designer: User | null;
    onConfirm: (preferredAgent: 'ai' | 'human') => void;
    isLoading: boolean;
}) {
    const [preferredAgent, setPreferredAgent] = useState<'ai' | 'human'>('ai');

    if (!designer) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline">沟通需求：与 {designer.name} 的专属沟通</DialogTitle>
                    <DialogDescription>请选择您希望开始沟通的方式。</DialogDescription>
                </DialogHeader>
                <div className="py-6">
                    <RadioGroup value={preferredAgent} onValueChange={(value) => setPreferredAgent(value as 'ai' | 'human')}>
                        <Label
                            htmlFor="agent-ai"
                            className="flex items-center justify-between rounded-lg border p-4 cursor-pointer has-[:checked]:bg-accent/10 has-[:checked]:border-accent"
                        >
                            <div className="flex items-center gap-3">
                                <Bot className="w-6 h-6 text-accent"/>
                                <div>
                                    <p className="font-semibold">与AI助理先沟通</p>
                                    <p className="text-xs text-muted-foreground">AI会先了解您的初步需求，稍后转接设计师。</p>
                                </div>
                            </div>
                            <RadioGroupItem value="ai" id="agent-ai" />
                        </Label>
                         <Label
                            htmlFor="agent-human"
                            className="flex items-center justify-between rounded-lg border p-4 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary"
                        >
                            <div className="flex items-center gap-3">
                                <UserIcon className="w-6 h-6 text-primary" />
                                <div>
                                    <p className="font-semibold">我想和设计师本人聊</p>
                                    <p className="text-xs text-muted-foreground">如果设计师繁忙，您可能需要排队等待。</p>
                                </div>
                            </div>
                            <RadioGroupItem value="human" id="agent-human" />
                        </Label>
                    </RadioGroup>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={() => onConfirm(preferredAgent)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "确认"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
    const [isCommDialogOpen, setIsCommDialogOpen] = useState(false);
    const [selectedDesigner, setSelectedDesigner] = useState<User | null>(null);

    const { user } = useAuthStore();
    const { toast } = useToast();

    const handleStartChat = (designer: User) => {
        if (!user) {
            toast({ title: "请先登录", description: "您需要登录后才能与设计师交流。", variant: "destructive" });
            return;
        }
        if (user.uid === designer.uid) {
            toast({ title: "提示", description: "您不能与自己发起沟通。" });
            return;
        }
        setSelectedDesigner(designer);
        setIsCommDialogOpen(true);
    };

    const handleConfirmCommunication = async (preferredAgent: 'ai' | 'human') => {
        if (!selectedDesigner || !user) return;
        
        setIsLoading(true);
        try {
            const { demandId, message } = await createPrivateDemand({ 
                requesterId: user.uid, 
                creatorId: selectedDesigner.uid,
                preferredAgent: preferredAgent,
            });

            if (message) {
                toast({ title: "提示", description: message });
            }
            
            const tempDemand: Demand = {
                id: demandId,
                requesterId: user.uid,
                creatorId: selectedDesigner.uid,
                title: `与 ${selectedDesigner?.name || ''} 的专属沟通`,
                description: '',
                budget: 0,
                category: '',
                status: '进行中',
                createdAt: new Date(),
                requesterName: user.name,
                requesterAvatar: user.avatar,
                type: 'private',
            };
            setChatDemand(tempDemand);
            setIsChatOpen(true);
            setIsCommDialogOpen(false);

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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {designers.map(designer => (
                    <DesignerCard 
                        key={designer.uid} 
                        designer={designer} 
                        onStartChat={handleStartChat} 
                        onBook={handleBook}
                    />
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
            
            <CommunicationDialog
                open={isCommDialogOpen}
                onOpenChange={setIsCommDialogOpen}
                designer={selectedDesigner}
                onConfirm={handleConfirmCommunication}
                isLoading={isLoading}
            />

        </div>
    );
}
