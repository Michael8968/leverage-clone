'use client';

import { useState } from 'react';
import { CloudFunctions } from '@/lib/services/functions';

export default function CloudFunctionsTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testFunction = async (
    functionName: string,
    testFn: () => Promise<any>
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log(`测试云函数: ${functionName}`);
      const res = await testFn();
      setResult(res);
      console.log(`${functionName} 成功:`, res);
    } catch (err: any) {
      setError(err.message || '调用失败');
      console.error(`${functionName} 失败:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            云函数测试面板
          </h1>
          <p className="text-gray-600 mb-6">
            测试 19 个已部署的云函数 - TCB SDK 直接调用
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <p className="text-sm text-blue-700">
              <strong>环境:</strong> {process.env.NEXT_PUBLIC_TCB_ENV_ID}
            </p>
          </div>
        </div>

        {/* AI 功能 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            🤖 AI 功能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() =>
                testFunction('executePrompt', () =>
                  CloudFunctions.AI.executePrompt({
                    prompt: '推荐3个适合办公室的产品',
                    userId: 'test-user-001',
                    scenario: 'shopping',
                  })
                )
              }
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              测试 AI 提示执行
            </button>

            <button
              onClick={() =>
                testFunction('recommendProducts', () =>
                  CloudFunctions.AI.recommendProducts({
                    userId: 'test-user-001',
                    preferences: { category: '办公用品' },
                  })
                )
              }
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              测试产品推荐
            </button>

            <button
              onClick={() =>
                testFunction('getProductRecommendations', () =>
                  CloudFunctions.AI.getProductRecommendations({
                    userId: 'test-user-001',
                    category: '电子产品',
                  })
                )
              }
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              获取产品推荐
            </button>

            <button
              onClick={() =>
                testFunction('recommendCreatives', () =>
                  CloudFunctions.AI.recommendCreatives({
                    demandId: 'test-demand-001',
                    requirements: { skills: ['UI设计', '3D建模'] },
                  })
                )
              }
              disabled={loading}
              className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              推荐创意者
            </button>
          </div>
        </div>

        {/* 需求管理 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            📋 需求管理
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() =>
                testFunction('createPrivateDemand', () =>
                  CloudFunctions.Demand.createPrivateDemand({
                    userId: 'test-user-001',
                    title: '测试需求 - LOGO 设计',
                    description: '需要一个现代简约风格的 LOGO',
                    budget: 5000,
                  })
                )
              }
              disabled={loading}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              创建私有需求
            </button>

            <button
              onClick={() =>
                testFunction('clarifyDemandDetails', () =>
                  CloudFunctions.Demand.clarifyDemandDetails({
                    demandId: 'test-demand-001',
                    chatId: 'test-chat-001',
                    userMessage: '我希望设计风格是科技感的',
                  })
                )
              }
              disabled={loading}
              className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              需求澄清
            </button>

            <button
              onClick={() =>
                testFunction('intelligentRoutingFlow', () =>
                  CloudFunctions.Demand.intelligentRoutingFlow({
                    demandId: 'test-demand-001',
                    userId: 'test-user-001',
                  })
                )
              }
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              智能路由
            </button>
          </div>
        </div>

        {/* 平台管理 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            ⚙️ 平台管理
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() =>
                testFunction('getPlatformAssets', () =>
                  CloudFunctions.Platform.getPlatformAssets()
                )
              }
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              获取平台资产
            </button>

            <button
              onClick={() =>
                testFunction('getPrompts', () =>
                  CloudFunctions.Platform.getPrompts({
                    scope: 'shopping',
                    status: 'active',
                  })
                )
              }
              disabled={loading}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              获取提示模板
            </button>
          </div>
        </div>

        {/* 3D 生成 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            🎨 3D 生成
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() =>
                testFunction('generate3dModel', () =>
                  CloudFunctions.Generate3D.generate3dModel({
                    prompt: '一把现代风格的办公椅',
                    aspectRatio: '1:1',
                  })
                )
              }
              disabled={loading}
              className="bg-violet-500 hover:bg-violet-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              生成 3D 模型图像
            </button>

            <button
              onClick={() =>
                testFunction('generateNanoBananaImage', () =>
                  CloudFunctions.Generate3D.generateNanoBananaImage({
                    prompt: '一个科技感的机器人',
                  })
                )
              }
              disabled={loading}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              Nano Banana 图像
            </button>
          </div>
        </div>

        {/* 结果显示 */}
        {(loading || result || error) && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {loading ? '⏳ 执行中...' : error ? '❌ 错误' : '✅ 结果'}
            </h2>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
                <pre className="text-sm text-gray-800">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
