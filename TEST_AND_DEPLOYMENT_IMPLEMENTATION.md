# 测试和部署实现总结

**创建日期**: 2024年
**状态**: ✅ P1 优先级任务完成

## 📋 项目概述

本文档总结了在 Leverage Clone 项目中实现的测试框架和自动化部署流程。这两个关键基础设施改进为生产环境部署提供了自动化和质量保证。

### 完成的 P1 任务

| 任务 | 状态 | 文件 | 测试结果 |
|------|------|------|---------|
| GitHub Actions TCB 部署流程 | ✅ 完成 | `.github/workflows/tcb-deploy.yml` | 配置完整 |
| 集成测试套件 - 数据流 | ✅ 完成 | `tests/integration/data-flows.test.ts` | 33/33 通过 ✅ |
| 集成测试套件 - API 端点 | ✅ 完成 | `tests/integration/api-endpoints.test.ts` | 16 个测试就绪 |

---

## 🚀 GitHub Actions 自动化部署流程

### 文件位置
```
.github/workflows/tcb-deploy.yml
```

### 工作流程概览

这是一个 5 阶段的 CI/CD 管道，自动化从代码推送到生产部署的全过程：

```
代码提交 → 代码质量检查 → Docker构建推送 → TCB部署 → 健康检查 → 通知
```

### 工作流配置

#### 触发条件
- **自动触发**: 推送到 `main` 或 `production` 分支
- **手动触发**: GitHub Actions 界面，可选择 `staging` 或 `production` 环境

#### 环境变量配置

| 变量名 | 说明 | 示例 |
|-------|------|------|
| `REGISTRY` | Tencent Cloud 容器镜像仓库 | `ccr.ccs.tencentyun.com` |
| `NAMESPACE` | 命名空间 | `leverage-ai` |
| `IMAGE_NAME` | 镜像名称 | `leverage-backend` |
| `NODE_VERSION` | Node.js 版本 | `18.17.0` |

#### 需要配置的 GitHub Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

| Secret 名称 | 说明 | 获取位置 |
|-----------|------|---------|
| `TCB_REGISTRY_USERNAME` | Tencent Cloud 镜像仓库用户名 | 腾讯云 CCR 控制台 |
| `TCB_REGISTRY_PASSWORD` | Tencent Cloud 镜像仓库密码 | 腾讯云 CCR 控制台 |
| `TCB_ENV_ID` | CloudBase 环境 ID | 腾讯云 CloudBase 控制台 |
| `TCB_SECRET_KEY` | CloudBase 密钥 | 腾讯云 CloudBase 控制台 |
| `TCB_API_KEY_ID` | TCB API 密钥 ID | 腾讯云控制台 |
| `TCB_API_KEY` | TCB API 密钥 | 腾讯云控制台 |
| `JWT_SECRET` | JWT 密钥 | 项目 .env 文件 |
| `HUNYUAN_API_KEY` | 混元 API 密钥（可选） | 腾讯云智能文本处理服务 |

### 工作流阶段详解

#### 阶段 1: 代码质量检查
```yaml
code-quality:
  - npm run typecheck    # TypeScript 类型检查
  - npm run lint         # ESLint 代码检查
  - npm run build        # 构建验证
```

**目的**: 在部署前确保代码无错误和潜在问题

#### 阶段 2: Docker 构建与推送
```yaml
build-and-push:
  - Docker 多阶段构建（优化镜像大小）
  - 启用 GitHub Actions 缓存加速构建
  - 推送到 Tencent Cloud CCR
```

**特点**:
- 使用层级缓存减少构建时间
- 支持多个镜像标签（latest, production, commit hash）
- 仅在代码质量检查通过时执行

#### 阶段 3: TCB Cloud Run 部署
```yaml
deploy-tcb:
  - cloudbase login           # 登录 CloudBase
  - cloudbase functions:deploy # 部署云函数
  - 配置环境变量和资源限制
```

**配置**:
- CPU: 0.5 核心
- 内存: 1GB
- 副本数: 1-3 个（自动扩展）
- 请求超时: 60 秒

#### 阶段 4: 健康检查
```yaml
health-check:
  - 最多重试 10 次，每次间隔 10 秒
  - 验证 /api/health 端点可用性
  - 验证关键 API 端点响应
```

**重试逻辑**:
```bash
for i in {1..10}; do
  curl -f http://service-url/api/health && break
  sleep 10
done
```

#### 阶段 5: 通知与发布
```yaml
notify:
  - Slack 通知部署状态
  - 创建 GitHub Release（tagged builds）
  - 发送部署总结
```

### 使用指南

#### 自动部署（推荐）
```bash
# 推送代码到 main 或 production 分支
git push origin main

# GitHub Actions 自动运行工作流
```

#### 手动部署
1. 进入 GitHub 仓库 → Actions 选项卡
2. 选择 "TCB Deployment" 工作流
3. 点击 "Run workflow"
4. 选择环境（staging/production）
5. 确认运行

### 监控部署

在 GitHub Actions 日志中查看每个阶段的执行情况。关键指标：
- ✅ `code-quality`: 代码通过质量检查
- ✅ `build-and-push`: Docker 镜像成功推送
- ✅ `deploy-tcb`: 应用部署到 TCB
- ✅ `health-check`: API 服务可用性验证
- ✅ `notify`: 部署通知已发送

---

## 🧪 集成测试框架

### 测试文件结构
```
tests/
├── integration/
│   ├── data-flows.test.ts        # 数据流集成测试 ✅ 33/33 通过
│   └── api-endpoints.test.ts     # API 端点测试 ✅ 代码完成
├── setup.ts                       # Jest 环境设置
└── (已删除) jest.config.js       # 使用 package.json 配置代替
```

### 测试执行

#### 运行所有测试
```bash
npm test
```

#### 运行特定测试文件
```bash
# 数据流测试
npm test -- tests/integration/data-flows.test.ts

# API 端点测试（需要运行中的服务器）
npm test -- tests/integration/api-endpoints.test.ts --no-coverage
```

#### 监视模式
```bash
npm test -- --watch
```

---

## 📊 数据流集成测试

### 文件位置
```
tests/integration/data-flows.test.ts
```

### 测试覆盖范围

#### 1. 需求 → 匹配 → 分配流程 (4 个测试)
```
需求创建 → 需求匹配 → 任务分配 → 状态转换
```

**验证项**:
- ✅ 需求对象创建成功
- ✅ 匹配过程执行
- ✅ 任务分配记录生成
- ✅ 需求状态正确转换

#### 2. LLM → 提示词 → 场景流程 (7 个测试)
```
LLM 连接 → 提示词应用 → AI 场景创建 → 场景执行
```

**验证项**:
- ✅ LLM 连接有效性验证
- ✅ 提示词内容有效性
- ✅ AI 场景完整性检查
- ✅ 场景执行流程

#### 3. 供应商 → 商品 → 搜索流程 (8 个测试)
```
供应商创建 → 商品添加 → 索引构建 → 搜索验证
```

**验证项**:
- ✅ 供应商信息完整性
- ✅ 商品数据有效性
- ✅ 搜索功能（价格范围、排序）
- ✅ 关联关系维护

### 测试统计

```
测试套件: 6 个
测试用例: 33 个
✅ 通过率: 100% (33/33)
执行时间: ~754ms
```

### 模拟数据工厂函数

测试使用以下工厂函数生成逼真的测试数据：

```typescript
createMockDemand()        // 创建模拟需求
createMockSupplier()      // 创建模拟供应商
createMockProduct()       // 创建模拟商品
createMockPrompt()        // 创建模拟提示词
createMockLlmConnection() // 创建模拟 LLM 连接
createMockAiScenario()    // 创建模拟 AI 场景
```

### 错误处理测试

测试覆盖以下错误场景：
- 缺少必需字段的数据
- 无效的数据类型
- 并发操作冲突
- 数据验证失败

---

## 🔗 API 端点测试

### 文件位置
```
tests/integration/api-endpoints.test.ts
```

### 测试覆盖的 API 端点

#### 健康检查 API
```
GET /api/health                # 系统健康状态检查
```

#### 提示词管理 API
```
GET /api/prompts               # 获取所有提示词
POST /api/prompts              # 创建新提示词
```

#### AI 场景 API
```
GET /api/ai_scenarios          # 获取所有场景
POST /api/ai_scenarios         # 创建新场景
```

#### LLM 连接 API
```
GET /api/llm_connections       # 获取所有 LLM 连接
POST /api/llm_connections      # 创建新连接
```

#### 供应商和商品 API
```
GET /api/suppliers             # 获取供应商列表
GET /api/products              # 获取商品列表
POST /api/suppliers            # 创建供应商
POST /api/products             # 创建商品
```

### 测试特性

#### 1. 基本功能测试
每个端点都测试：
- ✅ 正常响应状态码
- ✅ 数据返回格式
- ✅ 必需字段验证

#### 2. 错误处理
```
404 错误          # 资源未找到
4xx 错误          # 客户端错误
5xx 错误          # 服务器错误
```

#### 3. 并发请求处理
```typescript
// 同时发送多个请求
Promise.all([
  apiClient.request('GET', '/api/prompts'),
  apiClient.request('GET', '/api/ai_scenarios'),
  // ... 更多请求
])
```

#### 4. 性能测试
```typescript
// 验证响应时间 < 10 秒
const duration = endTime - startTime
expect(duration).toBeLessThan(10000)
```

### 运行 API 测试

**前置条件**: 需要运行的 API 服务器
```bash
# 终端 1: 启动服务器
npm run dev

# 终端 2: 运行测试
npm test -- tests/integration/api-endpoints.test.ts --no-coverage
```

---

## 📈 TypeScript 类型安全

所有测试代码都通过了严格的 TypeScript 类型检查：

### 数据流测试
```bash
✅ 0 编译错误
✅ 完整类型定义
✅ 类型推断正确
```

### API 端点测试
```bash
✅ 0 编译错误
✅ 泛型正确使用
✅ 响应类型明确
```

### 类型定义示例

```typescript
// 响应类型
interface APIResponse<T = any> {
  status: number
  data: T
}

// API 客户端
class APITestClient {
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<APIResponse<T>>
}
```

---

## 🔄 CI/CD 工作流程集成

### 完整流程图

```
┌─────────────────────────────────────────┐
│        代码推送到 main/production       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      运行 GitHub Actions 工作流         │
│   (自动触发或手动运行)                  │
└────────────┬────────────────────────────┘
             │
     ┌───────┼───────┐
     │       │       │
     ▼       ▼       ▼
┌──────┐ ┌──────┐ ┌──────┐
│类型  │ │ESLint│ │构建  │
│检查  │ │检查  │ │验证  │
└───┬──┘ └───┬──┘ └───┬──┘
    │        │        │
    └────────┼────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    Docker 构建与推送到 CCR              │
│    - 多阶段构建优化镜像大小             │
│    - GitHub Actions 缓存加速            │
│    - 推送到 Tencent Cloud CCR           │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    部署到 TCB Cloud Run                 │
│    - 配置环境变量                       │
│    - 设置资源限制                       │
│    - 启用自动扩展                       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    健康检查（最多 10 次重试）           │
│    - 验证 /api/health 端点              │
│    - 验证关键 API 端点                  │
│    - 15s 超时保护                       │
└────────────┬────────────────────────────┘
             │
     ┌───────┴───────┐
     │               │
  ✅ 成功         ❌ 失败
     │               │
     ▼               ▼
 ┌──────────┐  ┌──────────────┐
 │Slack通知 │  │回滚/告警     │
 │GitHub    │  │日志分析      │
 │Release   │  │重新部署      │
 └──────────┘  └──────────────┘
```

---

## 📋 下一步工作

### P2 优先级任务

#### 1. 创建数据健康检查 API 路由
- **文件**: `src/app/api/admin/data-health/route.ts`
- **功能**: 
  - 集成 `DataConsistencyValidator`
  - 集成 `DataHealthAnalyzer`
  - 返回健康指标和问题列表
- **预期输出**: JSON 格式的健康报告

#### 2. 实现管理员数据修复 UI 组件
- **位置**: `src/app/admin/data-health/`
- **组件**:
  - 数据健康仪表板
  - 问题列表和修复建议
  - AI 场景设置向导
  - 提示词管理工具

---

## 📚 相关文档

- [GitHub Actions 工作流配置](../.github/workflows/tcb-deploy.yml)
- [集成测试代码](../tests/integration/)
- [项目 README](../README.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [生产部署检查清单](./docs/PRODUCTION_CHECKLIST.md)

---

## 🎯 关键指标

### 代码质量
- ✅ TypeScript 编译错误: 0 个（测试代码）
- ✅ ESLint 检查: 通过
- ✅ 构建验证: 通过

### 测试覆盖
- ✅ 数据流测试: 33/33 通过 (100%)
- ✅ API 测试框架: 完整
- ✅ 错误处理: 完整

### 部署自动化
- ✅ CI/CD 管道: 5 个阶段完整
- ✅ 健康检查: 自动重试机制
- ✅ 通知系统: Slack 和 GitHub

---

## 💡 最佳实践

### 1. 提交代码前
```bash
# 运行测试
npm test

# 运行类型检查
npm run typecheck

# 运行代码检查
npm run lint

# 构建验证
npm run build
```

### 2. 部署前检查清单
- [ ] 所有本地测试通过
- [ ] 代码审核完成
- [ ] 提交消息清晰明确
- [ ] 环境变量配置正确

### 3. 监控部署
- 在 GitHub Actions 中查看实时日志
- 检查 Slack 通知
- 验证 API 端点可用性

---

## 📞 故障排查

### 常见问题

#### GitHub Actions 工作流失败
1. 检查 GitHub Secrets 配置
2. 验证分支触发条件（main/production）
3. 查看 Actions 日志中的详细错误

#### Docker 构建失败
1. 检查 Dockerfile 语法
2. 验证 Node.js 版本兼容性
3. 确保所有依赖已安装

#### 部署失败
1. 验证 TCB 环境 ID 正确
2. 检查 CloudBase 密钥权限
3. 查看 TCB 云函数日志

#### 健康检查失败
1. 确认 API 服务器已启动
2. 验证网络连接
3. 检查端口映射配置

---

**最后更新**: 2024年
**维护人**: Leverage AI 开发团队
