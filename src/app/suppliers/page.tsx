

'use client';

import { AppLayout } from '@/components/app-layout';
import { useState, useEffect, useCallback } from 'react';
import type { SupplementaryField, Supplier } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building, FileCog, Frown, Loader2, CalendarIcon, Package } from 'lucide-react';
import { DataProcessor } from '@/components/features/data-processor';
import { useAuthStore } from '@/store/auth';
import { doc, getDoc, setDoc, Timestamp } from '@/lib/cloudbase-compat';
import { snapshotExists, snapshotData } from '@/lib/snapshot-utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SupplementaryFieldsManager } from '@/components/features/supplementary-fields-manager';
import { ProductManagement } from '@/components/features/product-management';


// =================================================================
// Form Schema for Company Info
// =================================================================
const companyInfoSchema = z.object({
  name: z.string().min(2, { message: "供应商全称至少需要2个字符。" }),
  shortName: z.string().optional(),
  region: z.string().optional(),
  address: z.string().optional(),
  establishedDate: z.date().optional(),
  registeredCapital: z.string().optional(),
  creditCode: z.string().optional(),
});


// =================================================================
// COMPANY INFO TAB
// =================================================================
function CompanyInfoForm() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplementaryFields, setSupplementaryFields] = useState<SupplementaryField[]>([]);

  const form = useForm<z.infer<typeof companyInfoSchema>>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      name: "",
      shortName: "",
      region: "",
      address: "",
      establishedDate: undefined,
      registeredCapital: "",
      creditCode: "",
    },
  });

  useEffect(() => {
    const fetchSupplierInfo = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const supplierDocRef = doc('suppliers', user.uid) as any;
        const docSnap = await getDoc(supplierDocRef as any);
        const hasData = !!(docSnap && (docSnap.data || snapshotExists(docSnap)));
        if (hasData) {
          const supplierData = snapshotData(docSnap) as any as Supplier;

          const sanitizedData: { [key: string]: any } = {};
          for (const key in supplierData) {
              sanitizedData[key] = (supplierData as any)[key] === null ? '' : (supplierData as any)[key];
          }

          form.reset({
              ...sanitizedData,
              establishedDate: supplierData.establishedDate ? (supplierData.establishedDate as any)?.toDate ? (supplierData.establishedDate as any).toDate() : new Date(supplierData.establishedDate) : undefined,
          });
          setSupplementaryFields(supplierData.supplementaryFields || []);
        }
      } catch (error) {
        toast({ title: "加载失败", description: "无法加载您的公司信息。", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSupplierInfo();
  }, [user, form, toast]);

  const onSubmit = async (values: z.infer<typeof companyInfoSchema>) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
  const supplierDocRef = doc('suppliers', user.uid);
      
      const dataToSave: Partial<Supplier> = {
        ...values,
        id: user.uid,
        email: user.email,
        supplementaryFields: supplementaryFields,
      };

    if (values.establishedDate) {
      // CloudBase compat: store Date or ISO string; compat layer will normalize if needed
      (dataToSave as any).establishedDate = values.establishedDate;
    } else {
      dataToSave.establishedDate = null;
    }
      
      dataToSave.registeredCapital = values.registeredCapital || null;
      dataToSave.creditCode = values.creditCode || null;
      dataToSave.shortName = values.shortName || null;
      dataToSave.region = values.region || null;
      dataToSave.address = values.address || null;

  await setDoc(supplierDocRef as any, dataToSave, { merge: true } as any);
      toast({ title: "保存成功", description: "您的公司信息已更新。" });
    } catch (error) {
      toast({ title: "保存失败", description: `更新公司信息时出错: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Card><CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-2/3 mt-2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">供应商基本信息</CardTitle>
        <CardDescription>请填写准确、完整的公司信息。</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>供应商全称</FormLabel><FormControl><Input placeholder="例如: 创新科技(深圳)有限公司" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="shortName" render={({ field }) => (<FormItem><FormLabel>供应商简称</FormLabel><FormControl><Input placeholder="例如: 创新科技" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="region" render={({ field }) => (<FormItem><FormLabel>所在区域</FormLabel><FormControl><Input placeholder="例如: 广东省深圳市" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>详细地址</FormLabel><FormControl><Input placeholder="例如: 南山区科技园" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField
                control={form.control}
                name="establishedDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>成立日期</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "yyyy-MM-dd") : <span>年/月/日</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField control={form.control} name="registeredCapital" render={({ field }) => (<FormItem><FormLabel>注册资本</FormLabel><FormControl><Input placeholder="例如: 1000万元" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="creditCode" render={({ field }) => (<FormItem><FormLabel>统一社会信用代码</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            
            <SupplementaryFieldsManager 
              fields={supplementaryFields}
              onFieldsChange={setSupplementaryFields}
              title="补充信息"
            />
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                保存基本信息
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


// =================================================================
// PAGE ENTRYPOINT
// =================================================================
export default function SuppliersPage() {
  const { role, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role && !['supplier', 'admin'].includes(role)) {
      router.replace('/dashboard'); // Redirect if not a supplier or admin
    }
  }, [role, isLoading, router]);

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  
  if (!role || !['supplier', 'admin'].includes(role)) {
    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Frown className="w-16 h-16 mb-4 text-destructive"/>
                <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
                <p className="text-muted-foreground">此页面仅对供应商和管理员开放。</p>
            </div>
        </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8">
        <header>
          <h1 className="text-2xl font-headline font-bold">供应商中心</h1>
          <p className="text-muted-foreground">在此管理您的公司基本信息以及提供的商品与服务。</p>
        </header>
        <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="info"><Building className="mr-2"/> 基本信息</TabsTrigger>
                <TabsTrigger value="products"><Package className="mr-2"/> 商品/服务</TabsTrigger>
                <TabsTrigger value="batch"><FileCog className="mr-2"/> 批量处理</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-6"><CompanyInfoForm /></TabsContent>
            <TabsContent value="products" className="mt-6"><ProductManagement userType="supplier" /></TabsContent>
            <TabsContent value="batch" className="mt-6">
                <DataProcessor destination="suppliers" />
            </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
