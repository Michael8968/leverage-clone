

'use client';

import { AppLayout } from '@/components/app-layout';
import { useState, useEffect, useCallback } from 'react';
import type { SupplementaryField, Supplier } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building, FileCog, Frown, Loader2, CalendarIcon, Package, Image, Upload, Eye, Award, Camera } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';


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
        console.error('供应商信息加载错误:', error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        let friendlyMessage = '无法加载您的公司信息。';

        if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
          friendlyMessage = '权限不足：请确认您已登录供应商账号，或联系管理员获取相应权限。';
        } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
          friendlyMessage = '网络连接问题：请检查网络连接后重试。';
        } else if (errorMessage.includes('not-found') || errorMessage.includes('未找到')) {
          friendlyMessage = '数据未找到：您可能还没有完善公司信息，请先填写基本信息。';
        }

        toast({
          title: "加载供应商信息失败",
          description: friendlyMessage,
          variant: "destructive"
        });
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
      console.error('供应商信息保存错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      let friendlyMessage = '更新公司信息时出错，请稍后重试。';

      if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
        friendlyMessage = '权限不足：无法保存信息，请确认您的账号权限。';
      } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
        friendlyMessage = '网络连接问题：请检查网络连接后重试。';
      } else if (errorMessage.includes('validation') || errorMessage.includes('验证')) {
        friendlyMessage = '数据验证失败：请检查输入信息的格式是否正确。';
      } else if (errorMessage.includes('quota') || errorMessage.includes('配额')) {
        friendlyMessage = '存储配额不足：请联系管理员或清理不需要的数据。';
      }

      toast({
        title: "保存失败",
        description: friendlyMessage,
        variant: "destructive"
      });
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
// MEDIA ASSETS TAB
// =================================================================
function MediaAssetsTab() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [supplierData, setSupplierData] = useState<Supplier | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupplierData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const supplierDocRef = doc('suppliers', user.uid);
        const docSnap = await getDoc(supplierDocRef);
        if (snapshotExists(docSnap)) {
          const data = snapshotData(docSnap) as Supplier;
          setSupplierData(data);
        }
      } catch (error) {
        console.error('获取供应商媒体数据错误:', error);
        toast({
          title: "加载失败",
          description: "无法加载媒体资产数据。",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSupplierData();
  }, [user, toast]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">媒体资产</CardTitle>
          <CardDescription>公司logo、证书、照片等媒体文件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!supplierData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">媒体资产</CardTitle>
          <CardDescription>公司logo、证书、照片等媒体文件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-4 opacity-50 bg-muted rounded-full flex items-center justify-center">
              <Image className="w-6 h-6" />
            </div>
            <p>暂无媒体资产数据</p>
            <p className="text-sm mt-2">请先完善基本信息</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">媒体资产</CardTitle>
          <CardDescription>公司logo、证书、照片等媒体文件</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Company Logo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              <h3 className="text-lg font-semibold">公司Logo</h3>
            </div>
            {supplierData.logoUrl ? (
              <div className="flex items-center gap-4">
                <div
                  className="relative w-32 h-32 border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setLightboxImage(supplierData.logoUrl!)}
                >
                  <Image
                    src={supplierData.logoUrl}
                    alt="公司Logo"
                    fill={true}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">点击图片查看大图</p>
                  <Badge variant="secondary">已上传</Badge>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-muted-foreground/50 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">暂无Logo</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Business License */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              <h3 className="text-lg font-semibold">营业执照</h3>
            </div>
            {supplierData.businessLicenseUrl ? (
              <div className="flex items-center gap-4">
                <div
                  className="relative w-48 h-32 border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setLightboxImage(supplierData.businessLicenseUrl!)}
                >
                  <Image
                    src={supplierData.businessLicenseUrl}
                    alt="营业执照"
                    fill={true}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">点击图片查看大图</p>
                  <Badge variant="secondary">已上传</Badge>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-48 h-32 border-2 border-dashed border-muted-foreground/50 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">暂无执照</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Certificates */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              <h3 className="text-lg font-semibold">资质证书</h3>
            </div>
            {supplierData.certificates && supplierData.certificates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplierData.certificates.map((certUrl, index) => (
                  <div
                    key={index}
                    className="relative aspect-[4/3] border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setLightboxImage(certUrl)}
                  >
                    <Image
                      src={certUrl}
                      alt={`证书 ${index + 1}`}
                      fill={true}
                      className="object-contain"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">证书 {index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无资质证书</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Company Photos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              <h3 className="text-lg font-semibold">公司照片</h3>
            </div>
            {supplierData.companyPhotos && supplierData.companyPhotos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplierData.companyPhotos.map((photoUrl, index) => (
                  <div
                    key={index}
                    className="relative aspect-video border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setLightboxImage(photoUrl)}
                  >
                    <Image
                      src={photoUrl}
                      alt={`公司照片 ${index + 1}`}
                      fill={true}
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">照片 {index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无公司照片</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Product Showcase */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <h3 className="text-lg font-semibold">产品展示</h3>
            </div>
            {supplierData.productShowcase && supplierData.productShowcase.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplierData.productShowcase.map((product, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div
                      className="relative aspect-video cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setLightboxImage(product.url)}
                    >
                      {product.url.includes('.mp4') || product.url.includes('.webm') ? (
                        <video
                          src={product.url}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <Image
                          src={product.url}
                          alt={`产品展示 ${index + 1}`}
                          fill={true}
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{product.view}</Badge>
                        {product.url.includes('.mp4') || product.url.includes('.webm') ? (
                          <Badge variant="secondary">视频</Badge>
                        ) : (
                          <Badge variant="secondary">图片</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无产品展示</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
          <div className="w-full h-full flex items-center justify-center bg-black">
            {lightboxImage && (
              lightboxImage.includes('.mp4') || lightboxImage.includes('.webm') ? (
                <video
                  src={lightboxImage}
                  controls
                  className="max-w-full max-h-full"
                  autoPlay
                />
              ) : (
                <Image
                  src={lightboxImage}
                  alt="媒体预览"
                  width={800}
                  height={600}
                  className="max-w-full max-h-full object-contain"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
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
            <TabsList className="grid w-full grid-cols-4 max-w-lg">
                <TabsTrigger value="info"><Building className="mr-2"/> 基本信息</TabsTrigger>
                <TabsTrigger value="products"><Package className="mr-2"/> 商品/服务</TabsTrigger>
                <TabsTrigger value="media"><Image className="mr-2"/> 媒体资产</TabsTrigger>
                <TabsTrigger value="batch"><FileCog className="mr-2"/> 批量处理</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-6"><CompanyInfoForm /></TabsContent>
            <TabsContent value="products" className="mt-6"><ProductManagement userType="supplier" /></TabsContent>
            <TabsContent value="media" className="mt-6"><MediaAssetsTab /></TabsContent>
            <TabsContent value="batch" className="mt-6">
                <DataProcessor destination="suppliers" />
            </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
