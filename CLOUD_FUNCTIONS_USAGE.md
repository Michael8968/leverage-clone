# TCB 云函数调用指南

## 📚 概述

由于云接入（HTTP 触发器）尚未配置，前端暂时通过 TCB SDK 直接调用云函数。

## 🚀 使用方法

### 1. 导入云函数服务

```typescript
import { CloudFunctions } from '@/lib/services/functions';

// 或导入特定模块
import { AIFunctions, DemandFunctions } from '@/lib/services/functions';
```

### 2. 调用示例

#### AI 功能

```typescript
// 执行 AI 提示
const result = await CloudFunctions.AI.executePrompt({
  prompt: "推荐一些适合办公室的产品",
  userId: "user123",
  scenario: "shopping"
});

// 产品推荐
const recommendations = await CloudFunctions.AI.recommendProducts({
  userId: "user123",
  preferences: { category: "办公用品" }
});

// 创意者推荐
const creatives = await CloudFunctions.AI.recommendCreatives({
  demandId: "demand456",
  requirements: { skills: ["3D设计", "UI设计"] }
});
```

#### 需求管理

```typescript
// 创建私有需求
const demand = await CloudFunctions.Demand.createPrivateDemand({
  userId: "user123",
  title: "需要设计一个 LOGO",
  description: "公司品牌 LOGO 设计",
  budget: 5000
});

// 需求澄清
const clarification = await CloudFunctions.Demand.clarifyDemandDetails({
  demandId: "demand456",
  chatId: "chat789",
  userMessage: "我需要现代简约风格"
});

// 智能路由
const routing = await CloudFunctions.Demand.intelligentRoutingFlow({
  demandId: "demand456",
  userId: "user123"
});
```

#### 3D 生成

```typescript
// 生成 3D 模型图像
const image = await CloudFunctions.Generate3D.generate3dModel({
  prompt: "一个现代风格的椅子",
  aspectRatio: "1:1"
});

// 创建 Tripo3D 任务
const task = await CloudFunctions.Generate3D.generateTripo3dModel({
  prompt: "一个科技感十足的机器人",
  modelType: "text-to-3d"
});

// 查询任务状态
const status = await CloudFunctions.Generate3D.getTripo3dModelStatus({
  taskId: "task123"
});
```

#### 平台管理

```typescript
// 获取平台资产
const assets = await CloudFunctions.Platform.getPlatformAssets();

// 获取提示模板
const prompts = await CloudFunctions.Platform.getPrompts({
  scope: "shopping",
  status: "active"
});

// 测试 LLM 连接
const testResult = await CloudFunctions.Platform.testLlmConnection({
  connectionId: "conn123"
});
```

#### 媒体处理

```typescript
// 获取上传 URL
const uploadUrl = await CloudFunctions.Media.getUploadUrlForMediaAsset({
  fileName: "image.jpg",
  fileType: "image/jpeg"
});

// 分析媒体资源
const analysis = await CloudFunctions.Media.analyzeMediaAsset({
  assetId: "asset123",
  assetUrl: "https://example.com/image.jpg"
});
```

### 3. 在 React 组件中使用

```typescript
'use client';

import { useState } from 'react';
import { CloudFunctions } from '@/lib/services/functions';

export default function ProductRecommendation() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

  const getRecommendations = async () => {
    try {
      setLoading(true);
      const result = await CloudFunctions.AI.recommendProducts({
        userId: 'current-user-id',
        preferences: { category: '办公用品' }
      });
      setProducts(result.products || []);
    } catch (error) {
      console.error('获取推荐失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={getRecommendations} disabled={loading}>
        {loading ? '加载中...' : '获取推荐'}
      </button>
      {/* 渲染产品列表 */}
    </div>
  );
}
```

### 4. 错误处理

```typescript
try {
  const result = await CloudFunctions.AI.executePrompt({
    prompt: "测试提示",
    userId: "user123"
  });
  console.log('成功:', result);
} catch (error) {
  console.error('云函数调用失败:', error);
  // 处理错误：显示提示、重试等
}
```

## 📋 可用的云函数

### AI 功能
- ✅ `executePrompt` - 执行 AI 提示
- ✅ `recommendProducts` - 产品推荐
- ✅ `getProductRecommendations` - 获取产品推荐
- ✅ `recommendCreatives` - 推荐创意者

### 需求管理
- ✅ `createPrivateDemand` - 创建私有需求
- ✅ `clarifyDemandDetails` - 需求澄清
- ✅ `intelligentRoutingFlow` - 智能路由

### 3D 生成
- ✅ `generate3dModel` - 3D 模型图像生成
- ✅ `generateTripo3dModel` - Tripo3D 模型生成
- ✅ `getTripo3dModelStatus` - 查询生成状态
- ✅ `generateNanoBananaImage` - Nano Banana 图像生成

### 平台管理
- ✅ `getPlatformAssets` - 获取平台资产
- ✅ `getPrompts` - 获取提示模板
- ✅ `testLlmConnection` - 测试 LLM 连接
- ✅ `updateModelsFromLiteLLM` - 更新模型列表
- ✅ `batchUpdateUsers` - 批量更新用户

### 媒体处理
- ✅ `getUploadUrlForMediaAsset` - 获取上传 URL
- ✅ `analyzeMediaAsset` - 分析媒体资源

### 供应商
- ✅ `evaluateSellerData` - 评估供应商数据

## 🔄 迁移到 HTTP 触发器

当 HTTP 触发器配置完成后，可以创建一个 HTTP 客户端：

```typescript
// src/lib/services/http-functions.ts
export async function callFunctionHTTP(endpoint: string, data: any) {
  const response = await fetch(`https://your-api-gateway/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

然后只需要修改 `functions.ts` 中的 `callCloudFunction` 实现即可。

## ⚙️ 环境要求

确保 `.env.local` 中配置了：

```bash
NEXT_PUBLIC_TCB_ENV_ID=cloud1-7galmfiu70af91a6
NEXT_PUBLIC_ENV=production
```

## 🧪 测试云函数

```typescript
// 简单测试
import { CloudFunctions } from '@/lib/services/functions';

async function testCloudFunctions() {
  console.log('测试 AI 功能...');
  const result = await CloudFunctions.AI.executePrompt({
    prompt: "Hello, AI!",
    userId: "test-user"
  });
  console.log('AI 响应:', result);
}

testCloudFunctions();
```

## 📞 支持

如遇问题，请检查：
1. TCB 环境 ID 是否正确
2. 云函数是否已部署
3. 浏览器控制台的错误信息
