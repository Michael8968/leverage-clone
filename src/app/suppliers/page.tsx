
'use client';

import { AppLayout } from '@/components/app-layout';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProductService, SupplementaryField, Supplier } from '@/lib/types';
import { SupplementaryFieldsManager } from '@/components/features/supplementary-fields-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Loader2, Building, Package, Upload, FileCog, Frown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { DataProcessor } from '@/components/features/data-processor';
import { useAuthStore } from '@/store/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';

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
// Note: This component is also fully functional now.
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
        const newProductData = {
            name: '新产品 - ' + new Date().toLocaleTimeString(), description: '请填写详细描述', price: 99, category: '待分类',
            supplierId: user.uid, supplierName: user.name, createdAt: serverTimestamp(),
        };
        try {
            const docRef = await addDoc(collection(db, 'products'), newProductData);
            setProducts(prev => [{ ...newProductData, id: docRef.id, createdAt: new Date() } as unknown as ProductService, ...prev]);
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
            {isLoading ? <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
            : products.length > 0 ? products.map((product, index) => (
                <div key={product.id}>
                  <ProductServiceItem product={product} onUpdate={updateProduct} onRemove={removeProduct} />
                  {index < products.length - 1 && <Separator className="my-6" />}
                </div>
              ))
            : <div className="text-center text-muted-foreground py-8">暂无产品，请点击右上角按钮添加。</div>}
          </CardContent>
        </Card>
    );
}

function ProductServiceItem({ product, onUpdate, onRemove }: { product: ProductService; onUpdate: (id: string, data: Partial<ProductService>) => void; onRemove: (id: string) => void; }) {
  const [isSaving, setIsSaving] = useState(false);
  const [localProduct, setLocalProduct] = useState(product);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerUpdate = useCallback((updatedData: Partial<ProductService>) => {
    setIsSaving(true);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
        onUpdate(product.id, updatedData);
        setIsSaving(false);
    }, 1000);
  }, [onUpdate, product.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedValue = name === 'price' ? parseFloat(value) || 0 : value;
    setLocalProduct(prev => ({ ...prev, [name]: updatedValue }));
    triggerUpdate({ [name]: updatedValue });
  };
  
  useEffect(() => { setLocalProduct(product); }, [product]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input name="name" placeholder="产品名称" value={localProduct.name} onChange={handleChange} />
        <Input name="price" type="number" placeholder="价格" value={localProduct.price} onChange={handleChange} />
      </div>
      <Textarea name="description" placeholder="产品描述" value={localProduct.description} onChange={handleChange} />
      <div className="flex justify-end items-center gap-4">
        {isSaving && <Loader2 className="animate-spin text-muted-foreground" />}
        <Button variant="destructive" size="sm" onClick={() => onRemove(product.id)}><Trash2 className="mr-2 h-4 w-4" />删除</Button>
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
