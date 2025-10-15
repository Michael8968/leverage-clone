

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProductService, SupplementaryField, ProductImage, MediaAsset } from '@/lib/types';
import { SupplementaryFieldsManager } from '@/components/features/supplementary-fields-manager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Loader2, Upload, ImagePlus, GripVertical, ChevronDown, ChevronUp, ZoomIn, Info, BrainCircuit } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Reusable component for product management
export function ProductManagement({ userType }: { userType: 'supplier' | 'creator' }) {
    const [products, setProducts] = useState<ProductService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuthStore();
    const { toast } = useToast();

    const fetchProducts = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const fieldToQuery = userType === 'supplier' ? "supplierId" : "creatorId";
            const q = query(collection(db, 'products'), where(fieldToQuery, "==", user.uid));
            const snapshot = await getDocs(q);
            setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductService)));
        } catch (error) {
            toast({ title: "错误", description: "无法加载您的产品数据。", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast, userType]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const addProduct = async () => {
        if (!user) return;
        const newProductData: Partial<ProductService> = {
            name: '新产品/服务 - ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            description: '请填写详细描述',
            price: 99,
            category: '待分类',
            purchaseUrl: 'https://example.com/product/your-product-id',
            [userType === 'supplier' ? 'supplierId' : 'creatorId']: user.uid,
            images: [],
            details: [],
        };
        try {
            const docRef = await addDoc(collection(db, 'products'), {
                ...newProductData,
                createdAt: serverTimestamp()
            });
            setProducts(prev => [{ ...newProductData, id: docRef.id, createdAt: new Date() } as ProductService, ...prev]);
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
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            ) : products.length > 0 ? (
                products.map((product) => (
                    <ProductServiceItem key={product.id} product={product} onUpdate={updateProduct} onRemove={removeProduct} />
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
      const updatedProduct = {...localProduct, [field]: value};
      setLocalProduct(updatedProduct);
      triggerUpdate({ [field]: value });
  };
  
  useEffect(() => { setLocalProduct(product); }, [product]);
  
  const handleImagesChange = (newImages: ProductImage[]) => {
      handleFieldChange('images', newImages);
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
                        <Label htmlFor={`name-${product.id}`} className="sr-only">产品名称</Label>
                        <Input 
                            id={`name-${product.id}`}
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
                        <div className="space-y-2">
                            <Label htmlFor={`price-${product.id}`}>价格 (元)</Label>
                            <Input id={`price-${product.id}`} name="price" type="number" placeholder="99.00" value={localProduct.price} onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`category-${product.id}`}>类别</Label>
                            <Input id={`category-${product.id}`} name="category" placeholder="产品类别" value={localProduct.category} onChange={(e) => handleFieldChange('category', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`purchaseUrl-${product.id}`}>购买链接</Label>
                            <Input id={`purchaseUrl-${product.id}`} name="purchaseUrl" placeholder="https://example.com" value={localProduct.purchaseUrl || ''} onChange={(e) => handleFieldChange('purchaseUrl', e.target.value)} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor={`description-${product.id}`}>产品/服务描述</Label>
                        <Textarea id={`description-${product.id}`} name="description" placeholder="详细描述您的产品或服务..." value={localProduct.description} onChange={(e) => handleFieldChange('description', e.target.value)} rows={3} />
                    </div>
                    
                    <Separator />

                    <ImageManager product={product} onImagesChange={handleImagesChange} />

                    <Separator />
                    
                    <SupplementaryFieldsManager fields={localProduct.details || []} onFieldsChange={handleDetailsChange} title="详细设计/规格表"/>
                </div>
            </CollapsibleContent>
        </Collapsible>
    </Card>
  );
}

function ImageManager({ product, onImagesChange }: { product: ProductService, onImagesChange: (images: ProductImage[]) => void }) {
    const images = product.images || [];
    const [lightboxImage, setLightboxImage] = useState<ProductImage | null>(null);

    const addImage = () => {
        onImagesChange([...images, { url: '', view: '默认', mediaAssetId: '' }]);
    };

    const updateImage = (index: number, data: Partial<ProductImage>) => {
        const newImages = [...images];
        newImages[index] = { ...newImages[index], ...data };
        onImagesChange(newImages);
    };

    const removeImage = (index: number) => {
        onImagesChange(images.filter((_, i) => i !== index));
    };
    
    const viewOptions: ProductImage['view'][] = ['默认', '前', '后', '左', '右', '上', '下', '整体'];

    return (
      <div className="space-y-4">
        <h4 className="font-semibold">产品媒体集 (请直接粘贴URL)</h4>
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertTitle>提示</AlertTitle>
          <AlertDescription>
            由于尚未配置存储服务，当前仅支持通过粘贴外部URL的方式关联图片或视频。文件上传功能将在后续版本开放。
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(images || []).map((image, index) => (
            <Card key={index} className="group relative flex flex-col">
              <CardContent className="p-2 flex flex-col gap-2 flex-1">
                 <div className="relative aspect-video flex items-center justify-center bg-muted/50 rounded-md overflow-hidden">
                   {image.url ? (
                     <div className="w-full h-full">
                        {(image.url.includes('.mp4') || image.url.includes('.webm')) ? (
                           <video src={image.url} className="w-full h-full object-contain" muted loop playsInline />
                        ) : (
                           <Image src={image.url} alt={`Product image ${index + 1}`} layout="fill" className="object-contain" onError={(e) => e.currentTarget.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}/>
                        )}
                        <div 
                           className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                           onClick={() => setLightboxImage(image)}
                         >
                           <ZoomIn className="w-10 h-10 text-white" />
                        </div>
                     </div>
                  ) : (
                    <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="absolute top-0 right-0 m-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeImage(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                 <Input 
                  value={image.url || ''}
                  onChange={(e) => updateImage(index, { url: e.target.value })}
                  placeholder="粘贴图片/视频URL..."
                  className="col-span-2"
                />
                <div className="grid grid-cols-1 gap-2">
                  <Select value={image.view} onValueChange={(value) => updateImage(index, { view: value as ProductImage['view'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {viewOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button 
                              variant="link" 
                              size="sm" 
                              className="w-full gap-2 text-muted-foreground"
                              disabled={true}
                          >
                            <BrainCircuit className="w-4 h-4"/>
                              AI分析与建议
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>请先配置存储并上传内部文件，才能使用AI分析功能。</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addImage} className="aspect-video flex-col h-auto">
            <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
            添加媒体
          </Button>
        </div>
         {lightboxImage && (
            <Lightbox 
                image={lightboxImage} 
                onClose={() => setLightboxImage(null)} 
            />
        )}
      </div>
    );
}

const Lightbox = ({ image, onClose }: { image: ProductImage; onClose: () => void; }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const imgRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
    const isDragging = useRef(false);
    const lastMousePosition = useRef({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleAmount = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.min(Math.max(0.5, prev + scaleAmount), 5));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMousePosition.current.x;
        const dy = e.clientY - lastMousePosition.current.y;
        setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const isVideo = image.url && (image.url.includes('.mp4') || image.url.includes('.webm'));

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent 
                className="max-w-4xl w-full h-[80vh] p-0 border-0 flex items-center justify-center"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
            >
                <div className="w-full h-full overflow-hidden flex items-center justify-center">
                    {isVideo ? (
                        <video 
                            ref={imgRef as React.RefObject<HTMLVideoElement>}
                            src={image.url}
                            className="max-w-full max-h-full"
                            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: 'transform 0.1s ease-out' }}
                            controls 
                            autoPlay
                        />
                    ) : (
                        image.url && <img 
                            ref={imgRef as React.RefObject<HTMLImageElement>}
                            src={image.url} 
                            alt="Lightbox view" 
                            className="max-w-full max-h-full"
                            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: 'transform 0.1s ease-out' }}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
