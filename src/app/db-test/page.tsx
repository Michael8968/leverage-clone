'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from '@/lib/cloudbase-compat';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AppLayout } from '@/components/app-layout';

// This is a temporary component for testing the Firestore database connection.
export default function DatabaseTestPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [userCount, setUserCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const testConnection = async () => {
  try {
  console.log("Attempting to fetch users via cloudbase-compat...");
  const usersCollectionRef = collection('users');
  const querySnapshot = await getDocs(usersCollectionRef);
        
  const size = querySnapshot.size ?? 0;
  console.log(`Successfully fetched ${size} documents from the 'users' collection.`);
  setUserCount(size);
        setStatus('success');
      } catch (error: any) {
        console.error("Firestore connection test failed:", error);
        setErrorMessage(error.message || 'An unknown error occurred.');
        setStatus('error');
      }
    };

    testConnection();
  }, []);

  return (
    <AppLayout>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader>
                <CardTitle className="font-headline text-2xl">数据库连接测试</CardTitle>
                <CardDescription>
                    此页面用于验证前端应用与 Firestore 数据库 (a001) 的连接状态。
                </CardDescription>
                </CardHeader>
                <CardContent>
                {status === 'loading' && (
                    <div className="flex items-center justify-center p-8 space-x-3 text-lg">
                        <Loader2 className="animate-spin h-8 w-8 text-primary" />
                        <span>正在尝试连接...</span>
                    </div>
                )}
                {status === 'success' && (
                    <div className="p-8 text-center bg-green-50 rounded-lg">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-green-700">连接成功！</h3>
                        <p className="mt-2 text-gray-600">
                            已成功连接到 Firestore 数据库，并在 'users' 集合中找到了 <span className="font-bold text-lg">{userCount}</span> 条用户数据。
                        </p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="p-8 text-center bg-red-50 rounded-lg">
                        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-700">连接失败</h3>
                        <p className="mt-2 text-gray-600">无法连接到 Firestore 数据库。错误信息如下：</p>
                        <pre className="mt-4 p-2 text-left bg-gray-100 text-red-800 rounded-md text-xs overflow-auto">
                            {errorMessage}
                        </pre>
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
    </AppLayout>
  );
}
