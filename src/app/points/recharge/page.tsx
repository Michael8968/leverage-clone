
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';

// This product list should ideally be fetched from a database,
// but for now, it mirrors the backend API's hardcoded list.
const POINT_PRODUCTS = [
  { id: 'prod_10cny_1k', amountCNY: 10, pointsGranted: 1000, description: '1,000 积分', bonus: null },
  { id: 'prod_50cny_5k5', amountCNY: 50, pointsGranted: 5500, description: '5,500 积分', bonus: '10% 奖励' },
  { id: 'prod_100cny_12k', amountCNY: 100, pointsGranted: 12000, description: '12,000 积分', bonus: '20% 奖励' },
];

export default function RechargePage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  const handlePurchase = async (productId: string) => {
    if (!user) {
      toast({ variant: 'destructive', title: '错误', description: '您必须登录后才能充值。' });
      return;
    }

    setLoadingProductId(productId);

    try {
      const response = await fetch('/api/points/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, productId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '创建订单失败');
      }

      toast({
        title: '订单已创建',
        description: `订单号: ${result.orderId}. 接下来您将被引导至支付页面。`,
      });
      
      // In a real application, you would redirect to a payment gateway here:
      // window.location.href = `/pay?orderId=${result.orderId}`;

    } catch (error: any) {
      console.error('Purchase failed:', error);
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    } finally {
      setLoadingProductId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="mb-6 text-3xl font-bold">积分充值</h1>
      <div className="grid gap-6 md:grid-cols-3">
        {POINT_PRODUCTS.map((product) => (
          <Card key={product.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{product.description}</CardTitle>
              {product.bonus && (
                <CardDescription className="text-sm text-green-500">{product.bonus}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-4xl font-bold">¥{product.amountCNY}</p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handlePurchase(product.id)}
                disabled={loadingProductId === product.id}
              >
                {loadingProductId === product.id ? '处理中...' : '立即购买'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
