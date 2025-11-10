'use client';

import { useState, useEffect, useRef }from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bot, Loader2, Send, Sparkles, Settings, Trash2 } from 'lucide-react';
import { doc, onSnapshot, updateDoc, arrayUnion, setDoc, getDoc } from '@/lib/cloudbase-compat';
import { snapshotExists } from '@/lib/snapshot-utils';
import type { Demand, User, ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { clarifyDemandDetails } from '@/ai/flows/clarify-demand-details';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ChatDocument = {
  messages: ChatMessage[];
};

export function ChatDialog({ open, onOpenChange, demand, currentUser }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demand: Demand;
  currentUser: User;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isDesigner = currentUser.uid === demand.creatorId;

  // This should reflect the designer's setting, not a local state for the user.
  // We can fetch this once. In a real app, this might be part of the User object in auth store.
  const [isAiAssistantEnabledForDesigner, setIsAiAssistantEnabledForDesigner] = useState(false);

  useEffect(() => {
    if (!open) return;

  const chatDocRef = doc('chats', demand.id);
    const unsubscribe = onSnapshot(chatDocRef, (doc: any) => {
      if (doc && snapshotExists(doc)) {
        const data = doc.data() as ChatDocument;
        const formattedMessages = (data.messages || []).map((m: any) => ({
          ...m,
          timestamp: (m.timestamp as any)?.toDate ? (m.timestamp as any).toDate() : new Date(),
        } as ChatMessage));
        setMessages(formattedMessages);
      } else {
        // Create chat document if it doesn't exist
  setDoc(chatDocRef as any, { messages: [] });
      }
    });

    const fetchDesignerStatus = async () => {
        if(demand.creatorId) {
      const designerDoc = await getDoc(doc('users', demand.creatorId) as any);
      if (snapshotExists(designerDoc)) {
        setIsAiAssistantEnabledForDesigner(!!designerDoc.data().aiAssistantEnabled);
      }
        }
    };
    fetchDesignerStatus();


    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [open, demand.id, demand.creatorId]);

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !demand.creatorId) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      text: newMessage,
      senderId: currentUser.uid,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      timestamp: new Date(),
    };

    setIsSending(true);
  const chatDocRef = doc('chats', demand.id);
    
    try {
  await updateDoc(chatDocRef as any, {
        messages: arrayUnion(message),
      });
      setNewMessage('');
      
      // If AI assistant is enabled FOR THE DESIGNER, trigger it after user sends a message
      if (isAiAssistantEnabledForDesigner && currentUser.uid !== demand.creatorId) {
          triggerAiAssistant([...messages, message], demand.creatorId);
      }

    } catch (error) {
      toast({ title: "发送失败", description: "无法发送消息，请重试。", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const triggerAiAssistant = async (currentMessages: ChatMessage[], creatorId: string) => {
      setIsAiThinking(true);
      try {
          const aiResponse = await clarifyDemandDetails({
              demandId: demand.id,
              demandTitle: demand.title,
              demandDescription: demand.description,
              chatHistory: currentMessages.map((m: ChatMessage) => ({...m, text: m.text || ''})),
              userId: currentUser.uid,
              creatorId: creatorId,
          });

          // If the AI response is empty, it means a handoff happened and a system message was already posted.
          if (!aiResponse.clarification) {
              return;
          }

          const aiMessage: ChatMessage = {
              id: `ai_msg_${Date.now()}`,
              text: aiResponse.clarification,
              senderId: 'ai-assistant',
              senderName: 'AI 助理',
              senderAvatar: '/bot.png', 
              timestamp: new Date(),
              isAIMessage: true,
          };
          
          const chatDocRef = doc('chats', demand.id);
          await updateDoc(chatDocRef as any, {
              messages: arrayUnion(aiMessage),
          });

      } catch (error) {
          console.error("AI assistant failed:", error);
          toast({ title: "AI 助理出错了", description: "无法获取 AI 的回复。", variant: "destructive"});
      } finally {
          setIsAiThinking(false);
      }
  }

  const handleClearHistory = async () => {
    setIsClearConfirmationOpen(false);
    const chatDocRef = doc('chats', demand.id);
    try {
      await updateDoc(chatDocRef as any, {
        messages: [],
      });
      toast({ title: "成功", description: "聊天记录已清除。" });
    } catch (error) {
      toast({ title: "操作失败", description: "清除聊天记录时出错。", variant: "destructive" });
    }
  };

  const otherParticipant = currentUser.uid === demand.requesterId
    ? (demand.creatorId ? { name: "创意者" } : { name: "未知用户" })
    : { name: demand.requesterName };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl grid-rows-[auto,1fr,auto] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="font-headline">沟通需求: {demand.title}</DialogTitle>
                <DialogDescription>与 {otherParticipant.name} 进行实时沟通。</DialogDescription>
              </div>
              {isDesigner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsClearConfirmationOpen(true)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      清除聊天记录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-grow p-4 border rounded-md my-4" ref={scrollAreaRef}>
            <div className="space-y-4">
          {messages.map((msg: ChatMessage) => (
                <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === currentUser.uid ? "justify-end" : "justify-start")}>
                  {msg.senderId !== currentUser.uid && (
                    <Avatar className="h-8 w-8">
                      {msg.isAIMessage ? <Bot className="h-8 w-8 text-accent" /> : <AvatarImage src={msg.senderAvatar} />}
                      <AvatarFallback>{msg.senderName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("rounded-lg px-3 py-2 max-w-sm", msg.senderId === currentUser.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  {msg.senderId === currentUser.uid && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.senderAvatar} />
                      <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isAiThinking && (
                  <div className="flex items-end gap-2 justify-start">
                      <Avatar className="h-8 w-8">
                        <Bot className="h-8 w-8 text-accent animate-pulse" />
                      </Avatar>
                      <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin"/>
                          <p className="text-sm text-muted-foreground">正在思考...</p>
                      </div>
                  </div>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex-col gap-4">
            <div className="flex items-center gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="输入消息..."
                onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                disabled={isSending || isAiThinking}
              />
              <Button onClick={handleSendMessage} disabled={isSending || isAiThinking}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isClearConfirmationOpen} onOpenChange={setIsClearConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认操作</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要清除此对话的所有聊天记录吗？此操作不可撤销，将永久删除所有消息。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">确认清除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
