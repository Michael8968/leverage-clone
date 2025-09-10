'use client';

import { AppLayout } from '@/components/app-layout';
import { useState } from 'react';
import type { ProductService } from '@/lib/types';
import type { SupplementaryField } from '@/components/features/supplementary-fields-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { DataProcessor } from '@/components/features/data-processor';
import { SupplementaryFieldsManager } from '@/components/features/supplementary-fields-manager';

const initialProducts: ProductService[] = [
    { id: 'prod-1', name: '原创设计T恤', description: '采用100%新疆长绒棉，亲肤透气', price: 129, category: '服装' },
    { id: 'prod-2', name: '智能LED夜灯', description: '支持App控制，1600万色可调', price: 79, category: '电子产品' },
];

export default function SuppliersPage() {
  const [products, setProducts] = useState<ProductService[]>(initialProducts);
  const [infoFields, setInfoFields] = useState<SupplementaryField[]>([
    { id: 'info-1', key: '公司成立年份', value: '2018' },
  ]);

  const addProduct = () => {
    setProducts([
      ...products,
      { id: `prod-${Date.now()}`, name: '', description: '', price: 0, category: '' },
    ]);
  };

  const updateProduct = (updatedProduct: ProductService) => {
    setProducts(products.map(p => (p.id === updatedProduct.id ? updatedProduct : p)));
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };
  
  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8">
        <h1 className="text-2xl font-headline font-bold">供应商中心</h1>
        
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">公司基本信息</CardTitle>
                <CardDescription>管理您的供应商档案和公开信息。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input defaultValue="力维利治科技有限公司" label="公司名称" />
                    <Input defaultValue="supplier@leverage.ai" label="联系邮箱" />
                </div>
                 <SupplementaryFieldsManager fields={infoFields} onFieldsChange={setInfoFields} title="公司补充信息" />
            </CardContent>
        </Card>

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
            {products.map((product, index) => (
              <div key={product.id}>
                <ProductServiceItem
                  product={product}
                  onUpdate={updateProduct}
                  onRemove={removeProduct}
                />
                {index < products.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <DataProcessor />

      </div>
    </AppLayout>
  );
}

// Add label prop to Input
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
  const [fields, setFields] = useState<SupplementaryField[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onUpdate({ ...product, [e.target.name]: e.target.value });
  };
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...product, price: parseFloat(e.target.value) || 0 });
  };

  return (
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input name="name" placeholder="产品名称" value={product.name} onChange={handleChange} />
            <Input name="category" placeholder="类别" value={product.category} onChange={handleChange} />
            <Input name="price" type="number" placeholder="价格" value={product.price} onChange={handlePriceChange} />
        </div>
        <Textarea name="description" placeholder="产品描述" value={product.description} onChange={handleChange} />
        
        <SupplementaryFieldsManager fields={fields} onFieldsChange={setFields} title="产品规格参数" />

        <div className="flex justify-end">
            <Button variant="destructive" size="sm" onClick={() => onRemove(product.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                删除此产品
            </Button>
        </div>
    </div>
  );
}
