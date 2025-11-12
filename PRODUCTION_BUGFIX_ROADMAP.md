# 生产部署 Bug 修复路线图

## 概述

本文档详细说明了为生产部署准备系统所需的 Bug 修复和代码改进。目前共有 169 个 TypeScript 编译错误，主要集中在以下几个区域：

## 📊 错误分布分析

### 1. **API 路由参数处理错误** （40+ 错误）
**影响范围**：`src/app/api/**/route.ts` 文件

**原因**：Next.js 13+ 中动态路由处理器的 `params` 现在是 `Promise<{...}>` 类型，而代码仍在使用旧的同步方式。

**受影响文件**：
- `src/app/api/3d-models/[taskId]/route.ts`
- `src/app/api/ai_scenarios/route.ts`
- `src/app/api/appointments/route.ts`
- `src/app/api/availabilities/route.ts`
- `src/app/api/demands/route.ts`
- `src/app/api/llm_connections/route.ts`
- `src/app/api/media-assets/route.ts`
- `src/app/api/products/route.ts`
- `src/app/api/suppliers/route.ts` 等

**修复方案**：

```typescript
// 旧代码（同步）
export async function GET(req: Request, { params }: { params: { taskId: string } }) {
  const { taskId } = params;
}

// 新代码（async params）
export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
}
```

**优先级**：🔴 P0（关键）- 影响所有 API 路由

---

### 2. **数据库服务导出错误** （8+ 错误）
**影响范围**：`src/lib/services/db.ts`

**错误**：`dbType` 在本地声明但未导出

**修复**：
```typescript
// 在 src/lib/services/db.ts 中添加导出
export const dbType: 'firebase' | 'tcb' = process.env.USE_TCB ? 'tcb' : 'firebase';
```

**优先级**：🔴 P0（关键）

---

### 3. **用户类型不匹配错误**
**文件**：`src/app/api/auth/firebase-sync/route.ts` (第 77 行)

**问题**：创建用户时缺少必需的字段
```
missing properties: pointsBalance, level, totalLLMCalls, signupDate
```

**修复**：
```typescript
// 原来的代码
const newUser = {
  uid: user.uid,
  email: user.email,
  name: user.displayName || 'Anonymous',
  avatar: user.photoURL || '',
  role: 'user' as Role,
  status: 'active' as const,
  createdAt: new Date(),
};

// 修复后
const newUser = {
  uid: user.uid,
  email: user.email,
  name: user.displayName || 'Anonymous',
  avatar: user.photoURL || '',
  role: 'user' as Role,
  status: 'active' as const,
  pointsBalance: 5000,        // 新用户初始积分
  level: 'New' as const,
  totalLLMCalls: 0,
  createdAt: new Date(),
  signupDate: new Date(),
};
```

**优先级**：🔴 P0（关键）

---

### 4. **TCB 操作 API 错误**
**文件**：多个 API 路由使用 `insertedId` 而不是标准属性

**问题**：TCB 的返回值结构不同
```
Property 'insertedId' does not exist on type 'IAddRes'. Did you mean 'inserted'?
```

**修复**：
```typescript
// 错误的
const result = await collection.add(data);
const id = result.insertedId;

// 正确的（适配 TCB）
const result = await collection.add(data);
const id = result.inserted || result.insertedId || result._id;
```

**优先级**：🟠 P1（高）

---

### 5. **集合查询方法缺失**
**问题**：多处代码使用 `collection()` 函数但 `db` 对象为空

**原因**：`src/lib/services/db.ts` 的导出不完整

**受影响操作**：
- `collection(name)` - 获取集合
- `serverDate()` - 获取服务器时间戳

**修复**：确保 `src/lib/services/db.ts` 正确导出所有必需的函数

**优先级**：🔴 P0（关键）

---

## 📋 修复计划

### Phase 1: 关键修复（可立即进行）
1. **导出 dbType**
   - 文件：`src/lib/services/db.ts`
   - 时间：5 分钟

2. **修复 API 路由参数**
   - 文件：所有 `src/app/api/**/route.ts`
   - 时间：2-3 小时
   - 脚本化修复：逐个文件应用 `await params` 修复

3. **修复用户创建逻辑**
   - 文件：`src/app/api/auth/firebase-sync/route.ts` 和 `register/route.ts`
   - 时间：30 分钟

### Phase 2: 数据库兼容性修复（需测试）
1. **修复 TCB 返回值处理**
   - 时间：1 小时
   - 需要 TCB 文档参考

2. **验证集合查询方法**
   - 时间：1 小时
   - 需要测试 Firebase/TCB 兼容性

### Phase 3: 验证和测试
1. 运行 `npm run typecheck` 验证
2. 运行 `npm run build` 验证
3. 运行 `npm run test` 执行单元测试
4. 本地测试关键 API 路由

---

## 🎯 关键改进

### 为生产部署优化的配置

#### 1. 环境变量检查清单
```env
# 必需
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api.com
HUNYUAN_API_KEY=<api-key>
JWT_SECRET=<strong-secret>

# TCB 配置
USE_TCB=true
TCB_ENV_ID=<tencent-env-id>
TCB_SECRET_KEY=<tencent-secret-key>

# 数据库
TCB_DATABASE_URL=<database-url>
FIREBASE_PROJECT_ID=<fallback-if-needed>

# COS 存储
TCB_COS_REGION=ap-beijing
TCB_COS_BUCKET=<bucket-name>

# 其他
NEXT_TELEMETRY_DISABLED=1
SKIP_ENV_VALIDATION=false (生产环境需验证)
```

#### 2. 构建配置优化
确保 `next.config.js` 包含：
```javascript
module.exports = {
  // 生产优化
  swcMinify: true,
  compress: true,
  
  // AI 相关
  env: {
    SKIP_ENV_VALIDATION: false, // 生产必须验证
  },
  
  // 安全头
  headers: async () => [{
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
    ]
  }]
};
```

#### 3. Docker 构建优化
- 多阶段构建（已实现）
- 最终镜像大小：< 200MB
- Node 18+ LTS

#### 4. TCB 部署配置
- Cloud Run 资源：0.5 CPU, 1GB 内存
- 副本数：1-3（根据流量自动扩展）
- 健康检查路由：`/api/health`
- 启动超时：60 秒

---

## 📈 验证清单

在部署前必须完成：

### 代码质量
- [ ] `npm run typecheck` 通过（0 错误）
- [ ] `npm run build` 成功
- [ ] `npm run lint` 通过
- [ ] 关键路径的单元测试通过

### 功能验证
- [ ] 用户注册和登录工作
- [ ] LLM 连接测试通过
- [ ] 提示词执行成功
- [ ] AI 场景运行无错误
- [ ] 供应商和产品数据加载正常
- [ ] 文件上传到 COS 成功
- [ ] 健康检查端点响应正常

### 性能基准
- [ ] 首屏加载时间 < 3 秒
- [ ] API 响应时间 < 500ms (中位数)
- [ ] 数据库查询 < 200ms
- [ ] 内存使用 < 500MB

### 安全验证
- [ ] 所有敏感环境变量已配置
- [ ] JWT 密钥强度充分（32+ 字符）
- [ ] HTTPS 强制启用
- [ ] CORS 配置正确

### TCB 特定检查
- [ ] TCB 云函数部署成功
- [ ] 数据库集合初始化完成
- [ ] COS 存储桶权限正确
- [ ] 网络连接测试通过

---

## 🔧 快速修复脚本

### 批量修复 API 路由参数

创建 `fix-api-routes.ts` 脚本：

```typescript
import fs from 'fs';
import path from 'path';

const apiDir = path.join(process.cwd(), 'src/app/api');

function fixApiRoutes(dir: string) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixApiRoutes(filePath);
    } else if (file === 'route.ts') {
      let content = fs.readFileSync(filePath, 'utf-8');
      
      // 修复 params 类型定义
      content = content.replace(
        /params\s*:\s*\{\s*(\w+)\s*:\s*string\s*\}/g,
        'params: Promise<{ $1: string }>'
      );
      
      // 添加 await params
      content = content.replace(
        /const\s*\{\s*(\w+)\s*\}\s*=\s*params/g,
        'const { $1 } = await params'
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${filePath}`);
    }
  });
}

fixApiRoutes(apiDir);
console.log('API routes fixed!');
```

运行：`npx ts-node fix-api-routes.ts`

---

## 📞 支持和反馈

如遇到修复过程中的问题，请：

1. 检查错误的具体行号和消息
2. 查阅相关的类型定义文件
3. 查看现有的成功实现作为参考
4. 在 TCB 文档中验证 API 行为

---

## 下一步

1. **立即执行**：修复 Phase 1 的所有错误
2. **并行进行**：配置 CI/CD 流程以自动化验证
3. **准备部署**：确保所有环境变量都已正确设置
4. **性能测试**：在暂存环境中进行负载测试

