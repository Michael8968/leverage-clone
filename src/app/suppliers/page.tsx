
'use client';

import { AppLayout } from '@/components/app-layout';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProductService, SupplementaryField } from '@/lib/types';
import { SupplementaryFieldsManager } from '@/components/features/supplementary-fields-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Loader2, Building, Package, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { DataProcessor } from '@/components/features/data-processor';
import { useAuthStore } from '@/store/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function CompanyInfoForm() {
  const { user } = useAuthStore();
  const [fields, setFields] = useState<SupplementaryField[]>([]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">公司资料</CardTitle>
        <CardDescription>请填写准确、完整的公司信息。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
            <h3 className="font-medium">供应商LOGO</h3>
            <Button variant="outline"><Upload className="mr-2"/> 上传图片</Button>
        </div>
        <div className="space-y-4">
            <h3 className="font-medium">营业执照</h3>
            <Button variant="outline"><Upload className="mr-2"/> 上传文件</Button>
        </div>
        
        <Separator/>

        <div className="space-y-4">
            <h3 className="font-medium">联系人信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LabeledInput label="联系人" placeholder="例如: 张三"/>
                <LabeledInput label="职务" placeholder="例如: 市场总监" />
                <LabeledInput label="手机" type="tel" />
                <LabeledInput label="座机" type="tel" />
                <LabeledInput label="企微/客服" />
                <LabeledInput label="邮箱" type="email" defaultValue={user?.email} />
            </div>
            <LabeledInput label="企业微信号或其它客服联系方式" />
        </div>

        <Separator/>

        <SupplementaryFieldsManager fields={fields} onFieldsChange={setFields} title="补充内容" />
        
        <div className="flex justify-end">
           <Button>保存基本信息</Button>
       </div>
      </CardContent>
    </Card>
  )
}

function ProductManagement() {
    const [products, setProducts] = useState<ProductService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuthStore();
    const { toast } = useToast();

    useEffect(() => {
        const fetchProducts = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const productsCollection = collection(db, 'products');
            const productSnapshot = await getDocs(productsCollection);
            const productsList = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductService));
            setProducts(productsList);
        } catch (error) {
            console.error("Error fetching products:", error);
            toast({ title: "错误", description: "无法加载产品数据。", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
        };
        fetchProducts();
    }, [user, toast]);

    const addProduct = async () => {
        if (!user) return;
        const newProductData: Omit<ProductService, 'id'> = {
            name: '新产品或服务',
            description: '',
            price: 0,
            category: '',
            supplierId: user.id,
            purchaseUrl: '',
            sku: '',
            supplementaryFields: [],
        };
        try {
            const docRef = await addDoc(collection(db, 'products'), newProductData);
            setProducts([...products, { ...newProductData, id: docRef.id }]);
        } catch (error) {
            console.error("Error adding product:", error);
            toast({ title: "错误", description: "添加新产品失败。", variant: "destructive" });
        }
    };

    const updateProduct = useCallback(async (updatedProduct: ProductService) => {
        const { id, ...dataToUpdate } = updatedProduct;
        try {
            const productRef = doc(db, 'products', id);
            await updateDoc(productRef, dataToUpdate);
            setProducts(prevProducts => prevProducts.map(p => (p.id === id ? updatedProduct : p)));
        } catch (error) {
            console.error("Error updating product:", error);
            toast({ title: "错误", description: "更新产品失败。", variant: "destructive" });
        }
    }, [toast]);

    const removeProduct = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'products', id));
            setProducts(products.filter(p => p.id !== id));
            toast({ title: "成功", description: "产品已删除。" });
        } catch (error) {
            console.error("Error removing product:", error);
            toast({ title: "错误", description: "删除产品失败。", variant: "destructive" });
        }
    };

    return (
         <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="font-headline">产品/服务管理</CardTitle>
                <CardDescription>添加、编辑或删除您的产品及服务。</CardDescription>
              </div>
              <Button onClick={addProduct}>
                <PlusCircle className="mr-2" />
                添加新产品
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : products.length > 0 ? (
              products.map((product, index) => (
                <div key={product.id}>
                  <ProductServiceItem
                    product={product}
                    onUpdate={updateProduct}
                    onRemove={removeProduct}
                  />
                  {index < products.length - 1 && <Separator className="my-6" />}
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                暂无产品，请点击右上角按钮添加。
              </div>
            )}
          </CardContent>
        </Card>
    );
}

export default function SuppliersPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8">
        <header>
          <h1 className="text-2xl font-headline font-bold">供应商中心</h1>
          <p className="text-muted-foreground">在此管理您的公司基本信息以及提供的商品与服务。</p>
        </header>

        <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="info"><Building className="mr-2"/> 基本信息</TabsTrigger>
                <TabsTrigger value="products"><Package className="mr-2"/> 商品/服务</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-6">
                <CompanyInfoForm />
            </TabsContent>
            <TabsContent value="products" className="mt-6">
                <ProductManagement />
                <DataProcessor className="mt-8"/>
            </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

const LabeledInput = ({ label, ...props }: React.ComponentProps<typeof Input> & { label: string }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium">{label}</label>
    <Input {...props} />
  </div>
);

function ProductServiceItem({ product, onUpdate, onRemove }: {
  product: ProductService;
  onUpdate: (product: ProductService) => void;
  onRemove: (id: string) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [localProduct, setLocalProduct] = useState(product);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerUpdate = useCallback((updatedProduct: ProductService) => {
    setIsSaving(true);
    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(async () => {
        await onUpdate(updatedProduct);
        setIsSaving(false);
    }, 1000); // 1-second debounce
  }, [onUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedProduct = { ...localProduct, [name]: value };
    setLocalProduct(updatedProduct);
    triggerUpdate(updatedProduct);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedProduct = { ...localProduct, price: parseFloat(e.target.value) || 0 };
    setLocalProduct(updatedProduct);
    triggerUpdate(updatedProduct);
  };
  
  const handleFieldsChange = (fields: SupplementaryField[]) => {
    const updatedProduct = { ...localProduct, supplementaryFields: fields };
    setLocalProduct(updatedProduct);
    triggerUpdate(updatedProduct);
  }
  
  useEffect(() => {
    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput label="产品或服务名称" name="name" placeholder="产品名称" value={localProduct.name} onChange={handleChange} />
        <LabeledInput label="价格" name="price" type="number" placeholder="例如: 1299" value={localProduct.price} onChange={handlePriceChange} />
        <LabeledInput label="购买链接" name="purchaseUrl" placeholder="例如: https://item.jd.com/..." value={localProduct.purchaseUrl} onChange={handleChange} />
        <LabeledInput label="类别" name="category" placeholder="例如: 消费电子产品" value={localProduct.category} onChange={handleChange} />
        <LabeledInput label="SKU服务代码" name="sku" placeholder="产品或服务的唯一代码" value={localProduct.sku} onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">描述</label>
        <Textarea name="description" placeholder="产品描述" value={localProduct.description} onChange={handleChange} />
      </div>

      <SupplementaryFieldsManager fields={localProduct.supplementaryFields || []} onFieldsChange={handleFieldsChange} title="详细介绍产品或服务" />

      <div className="flex justify-end items-center gap-4">
        {isSaving && <Loader2 className="animate-spin text-muted-foreground" />}
        <Button variant="destructive" size="sm" onClick={() => onRemove(product.id)}>
          <Trash2 className="mr-2 h-4 w-4" />
          删除此产品
        </Button>
      </div>
    </div>
  );
}
