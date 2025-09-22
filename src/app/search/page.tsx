'use client';

import { useState, useEffect, Suspense, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, Loader2, ShoppingCart, Info, Sparkles, BrainCircuit } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProductService, Supplier } from '@/lib/types';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateUserProfile, type UserProfile } from '@/ai/flows/user-profiling';
import { getProductRecommendations } from '@/ai/flows/shopping-assistant';
import { Badge } from '@/components/ui/badge';

// =================================================================
// Product Card Component
// =================================================================
function ProductCard({ product, isAiRecommended, recommendationProfile }: { product: ProductService; isAiRecommended: boolean; recommendationProfile?: UserProfile | null; }) {
    return (
        <Card className={`overflow-hidden transition-all duration-300 ${isAiRecommended ? 'border-2 border-primary shadow-lg' : 'hover:shadow-md'}`}>
            {isAiRecommended && (
                <div className="bg-primary text-primary-foreground text-xs font-bold p-1 text-center">
                    AI 推荐
                </div>
            )}
            <CardContent className="p-0">
                <div className="relative h-48 w-full">
                    <Image
                        src={`https://picsum.photos/seed/${product.id}/400/300`}
                        alt={product.name}
                        layout="fill"
                        objectFit="cover"
                    />
                </div>
                <div className="p-4">
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 h-10 overflow-hidden">{product.description}</p>
                    {isAiRecommended && recommendationProfile && (
                         <div className="mt-2 p-2 rounded-lg bg-primary/10">
                            <div className="flex items-center gap-2 mb-1">
                                <BrainCircuit className="w-4 h-4 text-primary"/>
                                <p className="text-xs font-bold text-primary">推荐理由:</p>
                             </div>
                            <p className='text-xs text-muted-foreground italic'>"{recommendationProfile.summary}"</p>
                        </div>
                    )}
                    <div className="flex justify-between items-center mt-4">
                        <span className="text-xl font-headline font-semibold">¥{product.price}</span>
                        <Button size="sm">
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            购买
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// =================================================================
// Main Search Page Component
// =================================================================
function SearchPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  // State Management
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [allProducts, setAllProducts] = useState<ProductService[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [filteredResults, setFilteredResults] = useState<ProductService[]>([]);
  const [aiRecommendedIds, setAiRecommendedIds] = useState<string[]>([]);
  const [aiProfile, setAiProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Transitions / Loading States
  const [isInitialLoading, startInitialLoad] = useTransition();
  const [isAiSearching, startAiSearch] = useTransition();

  // Effect for initial data fetching
  useEffect(() => {
    startInitialLoad(async () => {
        try {
            const productsQuery = await getDocs(collection(db, 'products'));
            const productsData = productsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductService));
            setAllProducts(productsData);

            const suppliersQuery = await getDocs(collection(db, 'suppliers'));
            const suppliersData = suppliersQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
            setAllSuppliers(suppliersData);

        } catch (e) {
            console.error("Initial data fetch failed:", e);
            setError("无法加载产品目录，请稍后刷新页面重试。");
        }
    });
  }, []);

  // Effect for performing search when query or data changes
  useEffect(() => {
    if (initialQuery && allProducts.length > 0) {
        performClientSearch(initialQuery);
    }
    setSearchQuery(initialQuery);
    setAiRecommendedIds([]); // Reset AI recommendations on new search
    setAiProfile(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, allProducts]);

  // Stage 1: Fast client-side keyword search
  const performClientSearch = (query: string) => {
    const lowerCaseQuery = query.toLowerCase();
    const results = allProducts.filter(p => 
        p.name.toLowerCase().includes(lowerCaseQuery) ||
        p.description.toLowerCase().includes(lowerCaseQuery) ||
        p.category.toLowerCase().includes(lowerCaseQuery)
    );
    setFilteredResults(results);
  };

  // Stage 2: Deep AI-powered recommendation search
  const handleAiSearch = () => {
    startAiSearch(async () => {
      try {
        const profile = await generateUserProfile({ description: initialQuery });
        setAiProfile(profile);

        const recommendations = await getProductRecommendations({
          userProfile: profile,
          products: allProducts,
          suppliers: allSuppliers,
        });

        setAiRecommendedIds(recommendations.recommendations);

      } catch (e) {
        console.error("AI search failed:", e);
        setError("AI智能分析失败，请稍后再试。");
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };
  
  // Sorting results to show AI recommended ones first
  const sortedResults = [...filteredResults].sort((a, b) => {
      const aIsRecommended = aiRecommendedIds.includes(a.id);
      const bIsRecommended = aiRecommendedIds.includes(b.id);
      if (aIsRecommended && !bIsRecommended) return -1;
      if (!aIsRecommended && bIsRecommended) return 1;
      return 0;
  });

  // Render logic
  const renderContent = () => {
    if (isInitialLoading) {
        return (
             <div className="text-center text-muted-foreground flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p>正在加载产品目录...</p>
            </div>
        );
    }
    if (error) {
        return <Alert variant="destructive" className="mt-4"><Info className="h-4 w-4" /><AlertTitle>出错了</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    if (!initialQuery) {
        return <div className="text-center text-muted-foreground py-8"><p>在上方输入您的需求，开始智能搜索。</p></div>;
    }
    if (filteredResults.length === 0) {
        return <div className="text-center text-muted-foreground py-8"><p>未能找到与 “{initialQuery}” 相关的结果。</p></div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {sortedResults.map(product => (
                <ProductCard key={product.id} product={product} isAiRecommended={aiRecommendedIds.includes(product.id)} recommendationProfile={aiProfile} />
            ))}
        </div>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-headline font-bold">智能搜索</h1>
             <p className="text-muted-foreground mt-2">输入您的任何需求，AI将为您匹配最相关的产品、服务与信息。</p>
        </div>
        
        <div className="w-full max-w-2xl mx-auto mt-8">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                 <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="例如: 送给科幻迷的生日礼物..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Button type="submit">搜索</Button>
            </form>
        </div>

        {initialQuery && filteredResults.length > 0 && (
            <div className="w-full max-w-5xl mx-auto mt-6 text-center">
                <Card className="bg-primary/10 border-dashed border-primary">
                    <CardContent className="p-4 flex flex-col md:flex-row items-center justify-center gap-4">
                        <div className='flex items-center gap-2'>
                           <Sparkles className="h-6 w-6 text-primary" />
                           <p className="font-semibold">想得到更精准的推荐吗？</p>
                        </div>
                        <Button onClick={handleAiSearch} disabled={isAiSearching} className='bg-gradient-to-r from-primary to-accent'>
                            {isAiSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} 
                            {isAiSearching ? 'AI分析中...' : '启动AI深度分析'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )}

        <div className="w-full max-w-5xl mx-auto mt-4">
             {renderContent()}
        </div>
      </div>
    </AppLayout>
  );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div>Loading Page...</div>}>
            <SearchPageComponent />
        </Suspense>
    );
}
