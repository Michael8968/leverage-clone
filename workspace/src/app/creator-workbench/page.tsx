'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { AppLayout } from '@/components/app-layout';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from '@/components/ui/card';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui/time-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import {
  collection, getDocs, query, where, doc, updateDoc, addDoc, serverTimestamp,
  getDoc, deleteDoc, Timestamp, setDoc, orderBy, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

import type { Demand, ProductService, LlmConnection, Appointment, Availability, AssistantRule, Prompt, User, PointsTransaction } from '@/lib/types';

import {
  Frown, Bot, Loader2, ArrowRight, Wand2, Send, PackagePlus, Info, UploadCloud,
  FileImage, CalendarDays, Clock, Trash2, CheckCircle, XCircle, AlertCircle,
  ToggleLeft, ToggleRight, PlusCircle, Edit, Settings, Star, BrainCircuit,
  Users, Power, PowerOff, Coins, History
} from 'lucide-react';

import {
  generate3dModel, type Generate3dModelOutput
} from '@/ai/flows/generate-3d-model';
import { generateTripo3dModel } from '@/ai/flows/generate-tripo3d-model';
import { getTripo3dModelStatus } from '@/ai/flows/get-tripo3d-model-status';
import { generateNanoBananaImage } from '@/ai/flows/generate-nanobanana-image';
import { getUploadUrlForMediaAsset } from '@/ai/flows/multimodal-flows';
import { updateUserStatus, updateUserAssistantRules } from '@/ai/flows/user-management-flows';
import { getPrompts } from '@/ai/flows/admin-management-flows';
import { useAuthStore, type Role } from '@/store/auth';

// =================================================================
// Types and Constants
// =================================================================
type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAYS_OF_WEEK: { id: DayOfWeek; label: string }[] = [
  { id: 'mon', label: '一' }, { id: 'tue', label: '二' }, { id: 'wed', label: '三' },
  { id: 'thu', label: '四' }, { id: 'fri', label: '五' }, { id: 'sat', label: '六' }, { id: 'sun', label: '日' }
];
const ALL_ROLES: Role[] = ['admin', 'creator', 'supplier', 'user'];
const ROLE_NAMES: Record<Role, string> = {
  admin: '管理员', creator: '创意者', supplier: '供应商', user: '普通用户', suspended: '已禁用'
};

// Submission Schema
const submissionSchema = z.object({
  name: z.string().min(3, { message: "名称至少需要3个字符。" }),
  description: z.string().min(10, { message: "描述至少需要10个字符。" }),
  price: z.preprocess(
    (val) => val ? parseFloat(String(val)) : undefined,
    z.number({ invalid_type_error: "价格必须是一个数字。" }).positive({ message: "价格必须为正数。" })
  ),
  category: z.string().min(2, { message: "请填写一个类别。" })
});

// Helper to convert Base64 Data URI to File
async function dataUriToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
}

// =================================================================
// Tasks Tab
// =================================================================
function TasksTab() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();

  const fetchOpenDemands = useCallback(async () => {
    setIsLoading(true);
    try {
      const demandsCollection = collection(db, 'demands');
      const q = query(demandsCollection, where("status", "==", "开放中"));
      const demandSnapshot = await getDocs(q);
      const demandsList = demandSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Demand));
      setDemands(demandsList);
    } catch (error) {
      console.error("Error fetching open demands:", error);
      toast({ title: '加载失败', description: '无法加载任务列表。', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOpenDemands();
  }, [fetchOpenDemands]);

  const handleAcceptTask = async (demandId: string) => {
    if (!user) {
      toast({ title: '错误', description: '您需要登录才能接受任务。', variant: 'destructive' });
      return;
    }
    setAcceptingTaskId(demandId);
    try {
      const demandRef = doc(db, "demands", demandId);
      await updateDoc(demandRef, {
        status: "进行中",
        creatorId: user.uid,
      });
      toast({ title: "任务已接受！", description: "您已成功接受任务，请开始创作吧！" });
      await fetchOpenDemands();
    } catch (error) {
      console.error("Error accepting task:", error);
      toast({ title: '操作失败', description: '接受任务时发生错误，请重试。', variant: 'destructive' });
    } finally {
      setAcceptingTaskId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">任务需求池</CardTitle>
        <CardDescription>查看平台发布的任务以及开放的需求，选择您感兴趣的进行创作。</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>任务标题</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>酬金</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : demands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">当前暂无开放的需求。</TableCell>
              </TableRow>
            ) : (
              demands.map((demand) => (
                <TableRow key={demand.id}>
                  <TableCell className="font-medium">{demand.title}</TableCell>
                  <TableCell>{demand.category}</TableCell>
                  <TableCell>¥{demand.budget.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAcceptTask(demand.id)}
                      disabled={acceptingTaskId === demand.id}
                    >
                      {acceptingTaskId === demand.id ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                      接受任务
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// =================================================================
// Submission Form (Shared)
// =================================================================
interface SubmissionFormProps {
  imageUrl: string | null;
  onSubmissionSuccess: () => void;
  toolName: string;
}

function SubmissionForm({ imageUrl, onSubmissionSuccess, toolName }: SubmissionFormProps) {
  const [isSubmitting, startSubmission] = useTransition();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { name: '', description: '', price: 100, category: '3D模型' },
  });

  const handleSubmission = async (values: z.infer<typeof submissionSchema>) => {
    if (!imageUrl || !user) {
      toast({ title: '错误', description: '没有可提交的作品或用户信息丢失。', variant: 'destructive' });
      return;
    }

    startSubmission(async () => {
      try {
        const fileName = `${values.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
        const imageFile = await dataUriToFile(imageUrl, fileName);

        const { uploadUrl, mediaAssetId } = await getUploadUrlForMediaAsset({
          userId: user.uid,
          fileName: imageFile.name,
          contentType: imageFile.type,
        });

        await fetch(uploadUrl, {
          method: 'PUT',
          body: imageFile,
          headers: { 'Content-Type': imageFile.type },
        });

        const publicUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/media_assets/${user.uid}/${mediaAssetId}-${imageFile.name}`;

        await addDoc(collection(db, 'products'), {
          ...values,
          imageUrl: publicUrl,
          creatorId: user.uid,
          status: '审核中',
          createdAt: serverTimestamp(),
        });

        toast({ title: '提交成功！', description: '您的作品已提交审核，请在“我的提交”中查看状态。' });
        onSubmissionSuccess();
      } catch (error) {
        console.error('Submission failed:', error);
        toast({ title: '提交失败', description: '保存作品时发生错误，请重试。', variant: 'destructive' });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-6">
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Bot />
          {toolName} 生成结果
        </h3>
        <div className="rounded-lg border aspect-square bg-muted/50 flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="AI generated model"
              width={512}
              height={512}
              className="rounded-lg object-cover"
            />
          ) : (
            <p className="text-muted-foreground text-sm">图片加载失败</p>
          )}
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmission)} className="space-y-4 border p-4 rounded-lg h-full flex flex-col">
          <h3 className="font-semibold flex items-center gap-2">
            <PackagePlus />
            提交作品入库
          </h3>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>作品名称</FormLabel>
                <FormControl>
                  <Input placeholder="例如：赛博朋克浮空城" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>作品描述</FormLabel>
                <FormControl>
                  <Textarea placeholder="详细描述您的作品..." {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>建议价格(元)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>作品类别</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex-grow" />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
            提交审核
          </Button>
        </form>
      </Form>
    </div>
  );
}

// =================================================================
// Built-in AI Generator Tab
// =================================================================
interface BuiltInGeneratorProps {
  onSubmissionSuccess: () => void;
}

function BuiltInGenerator({ onSubmissionSuccess }: BuiltInGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, startGeneration] = useTransition();
  const [aiResult, setAiResult] = useState<Generate3dModelOutput | null>(null);
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!prompt) {
      toast({ title: '提示', description: '请输入您的创意描述。' });
      return;
    }
    setAiResult(null);
    startGeneration(async () => {
      try {
        const result = await generate3dModel(prompt);
        setAiResult(result);
      } catch (error) {
        console.error('AI generation failed:', error);
        toast({ title: '生成失败', description: 'AI模型创作时发生错误，请稍后重试。', variant: 'destructive' });
      }
    });
  };

  const handleSuccess = () => {
    setAiResult(null);
    setPrompt('');
    onSubmissionSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Textarea
          placeholder="例如：一个悬浮在空中的赛博朋克风格城市，有霓虹灯和飞行汽车..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
        />
        <Button onClick={handleGenerate} disabled={isGenerating} className="h-auto">
          {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />}
        </Button>
      </div>

      {isGenerating && (
        <div className="text-center p-8 space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
          <p className="text-muted-foreground">AI 正在全力创作中，请稍候...</p>
        </div>
      )}

      {aiResult?.imageDataUri && (
        <SubmissionForm imageUrl={aiResult.imageDataUri} onSubmissionSuccess={handleSuccess} toolName="内置AI" />
      )}
    </div>
  );
}

// =================================================================
// Tripo3D Generator Tab
// =================================================================
function Tripo3DGenerator({ onSubmissionSuccess }: BuiltInGeneratorProps) {
  const [personalApiKey, setPersonalApiKey] = useState('');
  const [globalApiKey, setGlobalApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedKey = localStorage.getItem('tripo3d_api_key');
    if (storedKey) setPersonalApiKey(storedKey);

    const fetchGlobalKey = async () => {
      try {
        const q = query(collection(db, 'llm_connections'), where('provider', '==', 'Tripo3D'), where('status', '==', '活跃'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const llmConnection = snapshot.docs[0].data() as LlmConnection;
          if (llmConnection.apiKey) {
            setGlobalApiKey(llmConnection.apiKey);
          }
        }
      } catch (err) {
        console.error('Failed to fetch global Tripo3D API key from llm_connections:', err);
      }
    };
    fetchGlobalKey();
  }, []);

  const handleApiKeyChange = (key: string) => {
    setPersonalApiKey(key);
    localStorage.setItem('tripo3d_api_key', key);
  };

  const pollTaskStatus = useCallback((currentTaskId: string, currentApiKey: string) => {
    const interval = setInterval(async () => {
      try {
        const data = await getTripo3dModelStatus({ taskId: currentTaskId, apiKey: currentApiKey });
        setTaskStatus(data);

        if (data.status === 'success' || data.status === 'failed') {
          clearInterval(interval);
          if (data.status === 'success') {
            setTaskId(null);
          } else {
            setError(data.error || '任务生成失败，请检查提示词或API Key。');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch task status');
        clearInterval(interval);
      }
    }, 5000);
    return interval;
  }, []);

  const handleGenerate = async () => {
    const apiKeyToUse = personalApiKey || globalApiKey;

    if (!prompt) {
      toast({ title: '提示', description: '请输入生成提示。' });
      return;
    }

    if (!apiKeyToUse) {
      toast({ title: '错误', description: '需要API Key才能生成。', variant: 'destructive' });
      return;
    }

    setError(null);
    try {
      const { task_id } = await generateTripo3dModel({ prompt, apiKey: apiKeyToUse });
      setTaskId(task_id);
      pollTaskStatus(task_id, apiKeyToUse);
    } catch (err: any) {
      setError(err.message || '生成请求失败');
      toast({ title: '生成失败', description: err.message, variant: 'destructive' });
    }
  };

  // Placeholder for full implementation - truncated in original
  return (
    <div className="space-y-6">
      {/* API Key Input and Prompt */}
      <div className="space-y-4">
        <Input
          placeholder="Tripo3D API Key (可选，优先使用)"
          value={personalApiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          type="password"
        />
        <Textarea
          placeholder="输入您的3D模型描述..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
        <Button onClick={handleGenerate} disabled={!prompt || !!taskId}>
          生成3D模型
        </Button>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {taskStatus && taskStatus.status === 'success' && (
        <SubmissionForm imageUrl={taskStatus.output_image_url} onSubmissionSuccess={onSubmissionSuccess} toolName="Tripo3D" />
      )}
      {/* Progress for polling */}
      {taskId && <Progress value={taskStatus?.progress || 0} />}
    </div>
  );
}

// =================================================================
// NanoBanana Generator Tab (Placeholder)
// =================================================================
function NanoBananaGenerator({ onSubmissionSuccess }: BuiltInGeneratorProps) {
  // Similar structure to other generators
  return (
    <div className="space-y-6">
      <p>Gemini Image Generator Placeholder</p>
      {/* Implement similar to BuiltInGenerator */}
    </div>
  );
}

// =================================================================
// Creations Tab
// =================================================================
function CreationsTab({ onSubmissionSuccess }: BuiltInGeneratorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">AI 图像创作</CardTitle>
        <CardDescription>选择您偏好的创作工具，输入创意描述，AI将为您生成预览图，完成后可直接提交入库审核。</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="built-in" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="built-in">内置模型</TabsTrigger>
            <TabsTrigger value="tripo3d">Tripo3D</TabsTrigger>
            <TabsTrigger value="nano-banana">Gemini Image</TabsTrigger>
          </TabsList>
          <TabsContent value="built-in" className="pt-6">
            <BuiltInGenerator onSubmissionSuccess={onSubmissionSuccess} />
          </TabsContent>
          <TabsContent value="tripo3d" className="pt-6">
            <Tripo3DGenerator onSubmissionSuccess={onSubmissionSuccess} />
          </TabsContent>
          <TabsContent value="nano-banana" className="pt-6">
            <NanoBananaGenerator onSubmissionSuccess={onSubmissionSuccess} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// =================================================================
// Schedule and Assistant Tab (Placeholder for full impl)
// =================================================================
function ScheduleAndAssistantTab() {
  // Full implementation would include availability, rules, etc.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Online Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">在线状态与接待设置</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toggle, availability picker, etc. */}
          <div>Schedule Placeholder</div>
        </CardContent>
      </Card>
      {/* Assistant Rules Card */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AI助理规则</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Rules list and dialog trigger */}
            <div>Assistant Rules Placeholder</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =================================================================
// Submissions Tab (Placeholder)
// =================================================================
interface SubmissionsTabProps {
  refreshKey: number;
}

function SubmissionsTab({ refreshKey }: SubmissionsTabProps) {
  // Fetch submissions based on refreshKey
  return <Card><CardContent>我的提交 Placeholder</CardContent></Card>;
}

// =================================================================
// Points History Dialog (Placeholder)
// =================================================================
function PointsHistoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle>收支历史</DialogTitle>
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Table for transactions */}
          <p>History Placeholder</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =================================================================
// Rule Dialog
// =================================================================
interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AssistantRule | null;
  onSave: (rule: AssistantRule) => void;
  prompts: Prompt[];
  isSaving: boolean;
}

function RuleDialog({ open, onOpenChange, rule: initialRule, onSave, prompts, isSaving }: RuleDialogProps) {
  const isEditing = !!initialRule;
  const [localRule, setLocalRule] = useState<AssistantRule>(
    initialRule || {
      id: `rule_${Date.now()}`,
      name: '',
      priority: 10,
      conditions: { ruleLogic: 'and' },
      action: { type: 'use_prompt', promptKey: '' }
    }
  );

  useEffect(() => {
    setLocalRule(
      initialRule || {
        id: `rule_${Date.now()}`,
        name: '',
        priority: 10,
        conditions: { ruleLogic: 'and' },
        action: { type: 'use_prompt', promptKey: '' }
      }
    );
  }, [initialRule]);

  const { toast } = useToast();

  const handleSave = () => {
    if (!localRule.name || !localRule.action.promptKey) {
      toast({ title: '信息不完整', description: '规则名称和执行动作不能为空。', variant: 'destructive' });
      return;
    }
    onSave(localRule);
  };

  const handleConditionChange = (field: keyof AssistantRule['conditions'], value: any) => {
    setLocalRule((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, [field]: value }
    }));
  };

  const handleDayToggle = (day: DayOfWeek) => {
    setLocalRule((prev) => {
      const currentDays = prev.conditions.daysOfWeek || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return {
        ...prev,
        conditions: { ...prev.conditions, daysOfWeek: newDays }
      };
    });
  };

  const handleRoleToggle = (role: Role) => {
    setLocalRule((prev) => {
      const currentRoles = { ...(prev.conditions.targetUserRoles || {}) };
      if (currentRoles[role]) {
        delete currentRoles[role];
      } else {
        currentRoles[role] = [];
      }
      return {
        ...prev,
        conditions: { ...prev.conditions, targetUserRoles: currentRoles }
      };
    });
  };

  const handleRatingToggle = (role: Role, rating: number) => {
    setLocalRule((prev) => {
      const currentRoles = { ...(prev.conditions.targetUserRoles || {}) };
      const currentRatings = currentRoles[role] || [];
      const newRatings = currentRatings.includes(rating)
        ? currentRatings.filter((r) => r !== rating)
        : [...currentRatings, rating];
      currentRoles[role] = newRatings;
      return {
        ...prev,
        conditions: { ...prev.conditions, targetUserRoles: currentRoles }
      };
    });
  };

  const updateRuleName = (name: string) => {
    setLocalRule((prev) => ({ ...prev, name }));
  };

  const updateRulePriority = (priority: string) => {
    setLocalRule((prev) => ({ ...prev, priority: parseInt(priority) || 10 }));
  };

  const updatePromptKey = (promptKey: string) => {
    setLocalRule((prev) => ({ ...prev, action: { ...prev.action, promptKey } }));
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline">
            {isEditing ? '编辑助理规则' : '新增助理规则'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            创建一条带有优先级的规则，以在特定条件下自动启用具有特定能力的AI助理。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="rule-name">规则名称</Label>
              <Input
                id="rule-name"
                value={localRule.name}
                onChange={(e) => updateRuleName(e.target.value)}
                placeholder="例如：夜间自动回复"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-priority">优先级 (1-100, 数字越小越高)</Label>
              <Input
                id="rule-priority"
                type="number"
                value={localRule.priority}
                onChange={(e) => updateRulePriority(e.target.value)}
              />
            </div>
          </div>
          <Accordion type="multiple" className="w-full" defaultValue={['conditions', 'action']}>
            <AccordionItem value="conditions">
              <AccordionTrigger>
                <div className="flex items-center gap-2 font-semibold">
                  <Settings className="w-4 h-4" />
                  触发条件
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="time">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        时间维度
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="p-4 border rounded-md space-y-4">
                        <div className="grid grid-cols-2 gap-4 items-center">
                          <div>
                            <Label>重复频率</Label>
                            <Select
                              value={localRule.conditions.repetition || 'none'}
                              onValueChange={(v) => handleConditionChange('repetition', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">不重复</SelectItem>
                                <SelectItem value="daily">每天</SelectItem>
                                <SelectItem value="weekly">每周</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {localRule.conditions.repetition === 'weekly' && (
                            <div>
                              <Label>选择星期</Label>
                              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
                                {DAYS_OF_WEEK.map((day) => (
                                  <div key={day.id} className="flex items-center space-x-1">
                                    <Checkbox
                                      id={`day-${day.id}`}
                                      checked={localRule.conditions.daysOfWeek?.includes(day.id)}
                                      onCheckedChange={() => handleDayToggle(day.id)}
                                    />
                                    <Label htmlFor={`day-${day.id}`} className="text-xs font-normal">
                                      {day.label}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {(localRule.conditions.repetition && localRule.conditions.repetition !== 'none') && (
                          <div>
                            <Label>生效时间窗口</Label>
                            <div className="flex items-center gap-2">
                              <TimePicker
                                date={localRule.conditions.startTime ? new Date(`1970-01-01T${localRule.conditions.startTime}`) : undefined}
                                setDate={(d) => handleConditionChange('startTime', d ? format(d, 'HH:mm') : undefined)}
                              />
                              <span>-</span>
                              <TimePicker
                                date={localRule.conditions.endTime ? new Date(`1970-01-01T${localRule.conditions.endTime}`) : undefined}
                                setDate={(d) => handleConditionChange('endTime', d ? format(d, 'HH:mm') : undefined)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <div className="flex items-center justify-center py-2">
                    <RadioGroup
                      value={localRule.conditions.ruleLogic}
                      onValueChange={(v) => handleConditionChange('ruleLogic', v)}
                      className="flex items-center space-x-4 border p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="and" id="logic-and" />
                        <Label htmlFor="logic-and">同时满足 (与)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="or" id="logic-or" />
                        <Label htmlFor="logic-or">满足任意一个 (或)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <AccordionItem value="user">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        用户维度
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        限定目标用户。若不配置，则对所有用户生效。
                      </p>
                      <div className="space-y-3">
                        {ALL_ROLES.map((role) => (
                          <div key={role} className="p-3 border rounded-md">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`role-${role}`}
                                checked={!!localRule.conditions.targetUserRoles?.[role]}
                                onCheckedChange={() => handleRoleToggle(role)}
                              />
                              <Label htmlFor={`role-${role}`} className="text-sm font-medium">
                                {ROLE_NAMES[role]}
                              </Label>
                            </div>
                            {localRule.conditions.targetUserRoles?.[role] && (
                              <div className="pt-3 mt-3 border-t">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                                  <Star className="w-3 h-3" />
                                  限定星级 (不选则对该角色所有星级生效)
                                </Label>
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => (
                                    <div key={rating} className="flex items-center space-x-1">
                                      <Checkbox
                                        id={`rating-${role}-${rating}`}
                                        checked={localRule.conditions.targetUserRoles?.[role]?.includes(rating)}
                                        onCheckedChange={() => handleRatingToggle(role, rating)}
                                      />
                                      <Label htmlFor={`rating-${role}-${rating}`} className="text-xs font-normal">
                                        {rating}星
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="action">
              <AccordionTrigger>
                <div className="flex items-center gap-2 font-semibold">
                  <BrainCircuit className="w-4 h-4" />
                  执行动作
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-2">
                {localRule.action.type === 'use_prompt' && (
                  <div className="space-y-2">
                    <Label>选择AI助理能力 (提示词)</Label>
                    <Select value={localRule.action.promptKey} onValueChange={updatePromptKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择一个提示词..." />
                      </SelectTrigger>
                      <SelectContent>
                        {prompts.map((p) => (
                          <SelectItem key={p.promptKey} value={p.promptKey}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存规则
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// =================================================================
// Main Workbench
// =================================================================
function CreatorWorkbench() {
  const [activeTab, setActiveTab] = useState('schedule-assistant');
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);
  const [showPointsDialog, setShowPointsDialog] = useState(false);
  // Add state for rules dialog, etc.

  const handleSubmissionSuccess = () => {
    setSubmissionsRefreshKey((prev) => prev + 1);
    setActiveTab('submissions');
  };

  return (
    <div className="p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-headline font-bold">创意者工作台</h1>
        <p className="text-muted-foreground mt-2">
          在这里, 您可以接受任务, 响应需求, 并利用AI工具将您的创意变为现实。
        </p>
      </header>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-3xl mx-auto">
          <TabsTrigger value="tasks">任务与需求</TabsTrigger>
          <TabsTrigger value="schedule-assistant">排班与助理</TabsTrigger>
          <TabsTrigger value="3d-creation">AI 创作</TabsTrigger>
          <TabsTrigger value="submissions">我的提交</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6">
          <TasksTab />
        </TabsContent>
        <TabsContent value="schedule-assistant" className="mt-6">
          <ScheduleAndAssistantTab />
        </TabsContent>
        <TabsContent value="3d-creation" className="mt-6">
          <CreationsTab onSubmissionSuccess={handleSubmissionSuccess} />
        </TabsContent>
        <TabsContent value="submissions" className="mt-6">
          <SubmissionsTab refreshKey={submissionsRefreshKey} />
        </TabsContent>
      </Tabs>
      <PointsHistoryDialog open={showPointsDialog} onOpenChange={setShowPointsDialog} />
      {/* Add RuleDialog here with state */}
    </div>
  );
}

// =================================================================
// Restricted Access
// =================================================================
function RestrictedAccess() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <Frown className="w-16 h-16 mb-4 text-destructive" />
      <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
      <p className="text-muted-foreground">此页面仅对“创意者”角色的用户开放。</p>
    </div>
  );
}

// =================================================================
// Page Export
// =================================================================
export default function CreatorWorkbenchPage() {
  const { role, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !role) {
      router.push('/login');
    }
  }, [role, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (role !== 'creator') {
    return <AppLayout><RestrictedAccess /></AppLayout>;
  }

  return <AppLayout><CreatorWorkbench /></AppLayout>;
}