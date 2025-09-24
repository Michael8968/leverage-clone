

'use client';

import { AppLayout } from '@/components/app-layout';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProductService, SupplementaryField, Supplier } from '@/lib/types';
import { SupplementaryFieldsManager } from '@/components/features/supplementary-fields-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Loader2, Building, Package, Upload, FileCog, Frown, ImagePlus, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { DataProcessor } from '@/components/features/data-processor';
import { useAuthStore } from '@/store/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Image from 'next/image';

// =================================================================
// Form Schema for Company Info
// =================================================================
const companyInfoSchema = z.object({
  name: z.string().min(2, { message: "公司名称至少需要2个字符。" }),
  contactPerson: z.string().optional(),
  jobTitle: z.string().optional(),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  customerService: z.string().optional(),
  email: z.string().email({ message: "请输入有效的邮箱地址。" }),
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
      name: user?.name || "",
      email: user?.email || "",
      contactPerson: "",
      jobTitle: "",
      mobile: "",
      phone: "",
      customerService: "",
    },
  });

  useEffect(() => {
    const fetchSupplierInfo = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const supplierDocRef = doc(db, 'suppliers', user.uid);
        const docSnap = await getDoc(supplierDocRef);
        if (docSnap.exists()) {
          const supplierData = docSnap.data() as Supplier;
          form.reset(supplierData);
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
      const supplierDocRef = doc(db, 'suppliers', user.uid);
      const dataToSave = {
        ...values,
        id: user.uid,
        supplementaryFields: supplementaryFields,
      };
      await setDoc(supplierDocRef, dataToSave, { merge: true });
      toast({ title: "保存成功", description: "您的公司信息已更新。" });
    } catch (error) {
      toast({ title: "保存失败", description: "更新公司信息时出错。", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">公司资料</CardTitle>
        <CardDescription>请填写准确、完整的公司信息。此信息将用于平台与您的联系。</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>公司名称</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>联系邮箱</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="contactPerson" render={({ field }) => (<FormItem><FormLabel>主要联系人</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="jobTitle" render={({ field }) => (<FormItem><FormLabel>职务</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem><FormLabel>手机</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>座机</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            </div>
            <Separator />
            <SupplementaryFieldsManager fields={supplementaryFields} onFieldsChange={setSupplementaryFields} title="补充内容" />
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
// PRODUCT MANAGEMENT TAB
// =================================================================
function ProductManagement() {
    const [products, setProducts] = useState<ProductService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuthStore();
    const { toast } = useToast();

    const fetchProducts = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const q = query(collection(db, 'products'), where("supplierId", "==", user.uid));
            const snapshot = await getDocs(q);
            setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductService)));
        } catch (error) {
            toast({ title: "错误", description: "无法加载您的产品数据。", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const addProduct = async () => {
        if (!user) return;
        const newProductData: Partial<ProductService> = {
            name: '新产品/服务 - ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
            description: '请填写详细描述', 
            price: 99, 
            category: '待分类',
            supplierId: user.uid, 
            supplierName: user.name, 
            createdAt: new Date(),
            imageUrls: [],
            details: [],
        };
        try {
            const docRef = await addDoc(collection(db, 'products'), {
                ...newProductData,
                createdAt: serverTimestamp() // Use server-side timestamp for writing
            });
            setProducts(prev => [{ ...newProductData, id: docRef.id } as ProductService, ...prev]);
            toast({ title: "成功", description: "新产品已添加，请继续编辑。" });
        } catch (error) {
            toast({ title: "错误", description: "添加新产品失败。", variant: "destructive" });
        }
    };

    const updateProduct = useCallback(async (id: string, data: Partial<ProductService>) => {
        try {
            await updateDoc(doc(db, 'products', id), data);
            setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
        } catch (error) {
            toast({ title: "错误", description: "更新产品失败。", variant: "destructive" });
        }
    }, [toast]);

    const removeProduct = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'products', id));
            setProducts(prev => prev.filter(p => p.id !== id));
            toast({ title: "成功", description: "产品已删除。" });
        } catch (error) {
            toast({ title: "错误", description: "删除产品失败。", variant: "destructive" });
        }
    };

    return (
         <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div><CardTitle className="font-headline">产品/服务管理</CardTitle><CardDescription>添加、编辑或删除您的产品及服务。</CardDescription></div>
              <Button onClick={addProduct}><PlusCircle className="mr-2" />添加新产品</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
            : products.length > 0 ? products.map((product) => (
                <ProductServiceItem key={product.id} product={product} onUpdate={updateProduct} onRemove={removeProduct} />
              ))
            : <div className="text-center text-muted-foreground py-8">暂无产品，请点击右上角按钮添加。</div>}
          </CardContent>
        </Card>
    );
}

function ProductServiceItem({ product, onUpdate, onRemove }: { product: ProductService; onUpdate: (id: string, data: Partial<ProductService>) => void; onRemove: (id: string) => void; }) {
  const [isSaving, setIsSaving] = useState(false);
  const [localProduct, setLocalProduct] = useState(product);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerUpdate = useCallback((updatedData: Partial<ProductService>) => {
    setIsSaving(true);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
        onUpdate(product.id, updatedData);
        setIsSaving(false);
    }, 1200);
  }, [onUpdate, product.id]);

  const handleFieldChange = (field: keyof ProductService, value: any) => {
      setLocalProduct(prev => ({...prev, [field]: value}));
      triggerUpdate({ [field]: value });
  };
  
  useEffect(() => { setLocalProduct(product); }, [product]);
  
  const handleImageUrlsChange = (newUrls: string[]) => {
      handleFieldChange('imageUrls', newUrls);
  }
  
  const handleDetailsChange = (newDetails: SupplementaryField[]) => {
      handleFieldChange('details', newDetails);
  }

  return (
    <Card className="overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                         <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <GripVertical className="h-4 w-4" />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                        <Input 
                            value={localProduct.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            className="text-base font-semibold border-0 bg-transparent focus-visible:ring-1"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {isSaving && <Loader2 className="animate-spin text-muted-foreground" />}
                         <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
                            {isOpen ? '收起' : '展开'}
                            {isOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                        </Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => onRemove(product.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
            <CollapsibleContent>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormItem>
                            <FormLabel>价格 (元)</FormLabel>
                            <Input name="price" type="number" placeholder="99.00" value={localProduct.price} onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)} />
                        </FormItem>
                        <FormItem>
                            <FormLabel>类别</FormLabel>
                            <Input name="category" placeholder="产品类别" value={localProduct.category} onChange={(e) => handleFieldChange('category', e.target.value)} />
                        </FormItem>
                         <FormItem>
                            <FormLabel>主图URL</FormLabel>
                            <Input name="imageUrl" placeholder="主图链接" value={localProduct.imageUrl || ''} onChange={(e) => handleFieldChange('imageUrl', e.target.value)} />
                        </FormItem>
                    </div>
                     <FormItem>
                        <FormLabel>产品/服务描述</FormLabel>
                        <Textarea name="description" placeholder="详细描述您的产品或服务..." value={localProduct.description} onChange={(e) => handleFieldChange('description', e.target.value)} rows={3} />
                    </FormItem>
                    
                    <Separator />

                    <ImageManager urls={localProduct.imageUrls || []} onUrlsChange={handleImageUrlsChange} />

                    <Separator />
                    
                    <SupplementaryFieldsManager fields={localProduct.details || []} onFieldsChange={handleDetailsChange} title="详细设计/规格表"/>
                </div>
            </CollapsibleContent>
        </Collapsible>
    </Card>
  );
}

function ImageManager({ urls, onUrlsChange }: { urls: string[], onUrlsChange: (urls: string[]) => void }) {
    const addImageUrl = () => {
        onUrlsChange([...urls, '']);
    };

    const updateImageUrl = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        onUrlsChange(newUrls);
    };

    const removeImageUrl = (index: number) => {
        onUrlsChange(urls.filter((_, i) => i !== index));
    };
    
    return (
        <div className="space-y-4">
            <h4 className="font-semibold">产品图片集</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {urls.map((url, index) => (
                    <Card key={index} className="group relative">
                        <CardContent className="p-2 aspect-video flex items-center justify-center bg-muted/50">
                            {url ? (
                                <Image src={url} alt={`Product image ${index + 1}`} width={160} height={90} className="object-contain rounded-md" onError={(e) => e.currentTarget.style.display = 'none'}/>
                            ) : (
                                <ImagePlus className="w-8 h-8 text-muted-foreground" />
                            )}
                        </CardContent>
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="destructive" size="icon" onClick={() => removeImageUrl(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <Input 
                            value={url}
                            onChange={(e) => updateImageUrl(index, e.target.value)}
                            placeholder="输入图片URL..."
                            className="mt-2"
                        />
                    </Card>
                ))}
                 <Button variant="outline" onClick={addImageUrl} className="aspect-video flex-col h-auto">
                    <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
                    添加图片
                </Button>
            </div>
        </div>
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
        <Tabs defaultValue="products">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="info"><Building className="mr-2"/> 基本信息</TabsTrigger>
                <TabsTrigger value="products"><Package className="mr-2"/> 商品/服务</TabsTrigger>
                <TabsTrigger value="batch"><FileCog className="mr-2"/> 批量处理</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-6"><CompanyInfoForm /></TabsContent>
            <TabsContent value="products" className="mt-6"><ProductManagement /></TabsContent>
            <TabsContent value="batch" className="mt-6"><DataProcessor /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
