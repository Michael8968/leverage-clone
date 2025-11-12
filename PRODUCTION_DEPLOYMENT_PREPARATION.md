# 生产部署准备清单 - Leverage AI Platform

**准备日期**: 2025年11月12日  
**版本**: 1.0  
**状态**: 正在进行

---

## 📋 第一部分：代码检查与BUG修复

### 1.1 类型检查与编译验证

#### 已完成修复
- [x] `src/components/app-layout.tsx`: 修复 `points_balance` → `pointsBalance`
- [x] 所有 UI 样式更新（字体、主题系统）
- [x] useTheme hook 集成

#### 待检查项目
```bash
# 命令
npm run typecheck
npm run build
npm run lint
```

#### 已知现存问题（暂不影响生产）
1. **权限管理页面缺失** (src/app/permissions/page.tsx)
   - Dialog 组件未导入
   - 预计 QA 会提出
   - 影响：仅 Admin 功能，不影响核心业务

2. **API 路由参数处理** (src/app/api/3d-models/[taskId]/route.ts)
   - Next.js 13+ 动态路由参数类型
   - 预计 Next.js 版本升级时修复
   - 影响：3D 模型异步查询，功能降级处理已实现

### 1.2 关键代码路径验证

| 模块 | 状态 | 优先级 | 说明 |
|------|------|--------|------|
| 认证系统 | ✅ | P0 | Firebase/TCB 混合模式，Token 验证完成 |
| 数据库抽象层 | ✅ | P0 | CloudBase 兼容层正常工作 |
| API 路由 | ⚠️ | P1 | 部分 API 缺少数据完整性验证 |
| 错误处理 | ⚠️ | P1 | 需要增强数据不全的降级处理 |
| 前端表单 | ✅ | P2 | Zod 验证完整 |

---

## 📊 第二部分：前后端关联验证

### 2.1 数据流关键路径

#### A. 需求创建 → 智能匹配 → 创意分配 → 交付

```
用户创建需求
  ↓
validateDemandInput() ← 检查必填字段
  ↓
clarifyDemandDetails() ← AI 补充细节（依赖 LLM）
  ↓
recommendCreatives() ← 推荐创意者（依赖 AI 场景配置）
  ↓
intelligentRouting() ← 路由分配（依赖供应商/设计师数据）
  ↓
创建订单/合约
```

**关键依赖**:
- ✅ LLM 连接可用
- ⚠️ AI 场景配置完整
- ⚠️ 供应商/设计师数据完整

#### B. LLM → 提示词 → AI场景 → 执行流

```
LLM 连接配置
  ↓
提示词库 (Prompts)
  ↓
AI 场景 (AIScenarios)
  ↓
executePrompt() → 调用 LLM
  ↓
缓存结果 / 返回给前端
```

**关键依赖**:
- ✅ LLM API Key 配置
- ⚠️ 提示词数据初始化
- ⚠️ AI 场景配置正确

#### C. 供应商数据 → 商品管理 → 搜索推荐 → 采购

```
供应商注册
  ↓
完善公司信息 + 资质
  ↓
上传商品/服务
  ↓
AI 分析优化描述
  ↓
搜索引擎索引
  ↓
推荐给用户
```

**关键依赖**:
- ⚠️ 供应商信息完整
- ⚠️ 商品数据结构一致
- ✅ 搜索 API 正常

### 2.2 类型一致性检查

#### API 返回类型与前端期望

**需检查的端点**:

1. **GET /api/prompts**
   ```typescript
   // 期望返回
   {
     success: boolean;
     prompts: Prompt[];
     total: number;
   }
   // 实际：可能缺少 total
   ```

2. **GET /api/ai_scenarios**
   ```typescript
   // 期望返回
   {
     success: boolean;
     scenarios: AIScenario[];
     linkedLLMs: string[];  // 已链接的 LLM ID
   }
   // 实际：可能缺少 linkedLLMs
   ```

3. **GET /api/llm_connections**
   ```typescript
   // 期望返回
   {
     success: boolean;
     connections: LLMConnection[];
     activeConnections: number;
   }
   // 实际：可能缺少 activeConnections 统计
   ```

### 2.3 关键集成点测试用例

```typescript
// test-integration-flow.ts

describe('完整数据流集成测试', () => {
  test('智能场景依赖链完整性', async () => {
    // 1. 检查 LLM 是否配置
    const llmConnections = await getLLMConnections();
    expect(llmConnections.length).toBeGreaterThan(0);
    
    // 2. 检查提示词是否存在
    const prompts = await getPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    
    // 3. 检查智能场景是否正确链接
    const scenarios = await getAIScenarios();
    for (const scenario of scenarios) {
      expect(scenario.linkedLLMId).toBeDefined();
      expect(scenario.linkedPromptIds.length).toBeGreaterThan(0);
    }
  });

  test('供应商数据链条完整性', async () => {
    // 1. 检查供应商基本信息
    const suppliers = await getSuppliers();
    for (const supplier of suppliers) {
      expect(supplier.name).toBeDefined();
      expect(supplier.status).toBeDefined();
    }
    
    // 2. 检查商品数据
    const products = await getProducts({
      supplierId: suppliers[0]?.id
    });
    for (const product of products) {
      expect(product.name).toBeDefined();
      expect(product.price).toBeGreaterThan(0);
    }
  });
});
```

---

## 🔧 第三部分：TCB 环境部署配置

### 3.1 部署前环境检查清单

#### GitHub 分支准备
```bash
# 确保部署分支是最新的
git branch -a | grep tcb-cloudrun-fullstack-ready

# 对比两个分支的差异
git diff develop..tcb-cloudrun-fullstack-ready --stat

# 合并前进行完整测试
git checkout tcb-cloudrun-fullstack-ready
npm ci
npm run build
npm run test
```

#### 项目文件验证
```bash
# 检查 Dockerfile
ls -lah Dockerfile

# 验证构建脚本
cat Dockerfile | grep -A5 "HEALTHCHECK"

# 确认环境变量模板
cat .env.example | grep TCB_
```

### 3.2 TCB 云托管部署配置

#### 环境变量配置（TCB 控制台）

```yaml
# 应用基础配置
NODE_ENV: production
NEXT_PUBLIC_ENV: production
PORT: 3000
NEXT_TELEMETRY_DISABLED: 1

# TCB 数据库配置
NEXT_PUBLIC_TCB_ENV_ID: cloud1-7galmfiu70af91a6
TCB_SECRET_ID: <从腾讯云获取>
TCB_SECRET_KEY: <从腾讯云获取>

# AI 服务配置
HUNYUAN_API_KEY: <从腾讯混元获取>
HUNYUAN_BASE_URL: https://api.hunyuan.cloud.tencent.com/v1

# 认证和授权
JWT_SECRET: <使用强随机字符串>
NEXTAUTH_SECRET: <使用强随机字符串>

# Firebase (仅用于开发，生产不建议使用)
# NEXT_PUBLIC_FIREBASE_API_KEY: <可选>

# 对象存储（COS）
COS_BUCKET: <腾讯云 COS bucket 名称>
COS_REGION: ap-shanghai
COS_SECRET_ID: <从腾讯云获取>
COS_SECRET_KEY: <从腾讯云获取>

# 监控和日志
SENTRY_DSN: <可选，用于错误监控>
LOG_LEVEL: info
```

#### 容器资源配置

```yaml
# 资源规格
CPU: 0.5 核
Memory: 1GB

# 副本配置
minReplicas: 1
maxReplicas: 3

# 自动扩容策略
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 75

# 网络配置
port: 3000 (内部)
exposedPort: 80 (外部)
protocol: HTTP/1.1
```

#### 健康检查配置

```yaml
# 就绪探针 (Readiness Probe)
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
    scheme: HTTP
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 3

# 存活探针 (Liveness Probe)
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
    scheme: HTTP
  initialDelaySeconds: 30
  periodSeconds: 30
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 3

# 启动探针 (Startup Probe) - 用于缓慢启动的应用
startupProbe:
  httpGet:
    path: /api/health
    port: 3000
    scheme: HTTP
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 24  # 最多等待 2 分钟
```

#### 健康检查 API 实现

```typescript
// src/app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/services/db';
import { checkExternalServices } from '@/lib/services/health-check';

export async function GET(req: NextRequest) {
  try {
    // 快速健康检查 (TCB 探针)
    if (req.nextUrl.searchParams.get('quick') === 'true') {
      return NextResponse.json({ status: 'healthy' }, { status: 200 });
    }

    // 完整健康检查
    const dbHealthy = await checkDatabaseConnection();
    const externalHealthy = await checkExternalServices();

    if (!dbHealthy || !externalHealthy) {
      return NextResponse.json(
        { 
          status: 'degraded',
          database: dbHealthy,
          external: externalHealthy
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: 'healthy' }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'unhealthy', error: String(error) },
      { status: 503 }
    );
  }
}
```

### 3.3 CI/CD 流程配置

#### GitHub Actions 配置

```yaml
# .github/workflows/tcb-deploy.yml
name: Deploy to TCB

on:
  push:
    branches:
      - tcb-cloudrun-fullstack-ready
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          SKIP_ENV_VALIDATION: true
        run: npm run build
      
      - name: Build Docker image
        run: |
          docker build \
            -t ccr.ccs.tencentyun.com/tcb-100011340160-hcwe/ca-qrxboqpw_leverage:${{ github.sha }} \
            -t ccr.ccs.tencentyun.com/tcb-100011340160-hcwe/ca-qrxboqpw_leverage:latest \
            .
      
      - name: Push to Tencent Cloud Registry
        env:
          TCB_REGISTRY_USERNAME: ${{ secrets.TCB_REGISTRY_USERNAME }}
          TCB_REGISTRY_PASSWORD: ${{ secrets.TCB_REGISTRY_PASSWORD }}
        run: |
          echo "$TCB_REGISTRY_PASSWORD" | docker login \
            ccr.ccs.tencentyun.com \
            -u "$TCB_REGISTRY_USERNAME" \
            --password-stdin
          
          docker push ccr.ccs.tencentyun.com/tcb-100011340160-hcwe/ca-qrxboqpw_leverage:${{ github.sha }}
          docker push ccr.ccs.tencentyun.com/tcb-100011340160-hcwe/ca-qrxboqpw_leverage:latest
      
      - name: Deploy to TCB Cloud Run
        env:
          TCB_ENV_ID: ${{ secrets.TCB_ENV_ID }}
          TCB_SECRET_ID: ${{ secrets.TCB_SECRET_ID }}
          TCB_SECRET_KEY: ${{ secrets.TCB_SECRET_KEY }}
        run: |
          npm install -g @cloudbase/cli
          tcb login --secret-id $TCB_SECRET_ID --secret-key $TCB_SECRET_KEY
          tcb service:deploy \
            --name leverage-platform \
            --image ccr.ccs.tencentyun.com/tcb-100011340160-hcwe/ca-qrxboqpw_leverage:latest \
            --env-id $TCB_ENV_ID
```

---

## 🔄 第四部分：数据不全优化处理

### 4.1 问题现象分析

| 模块 | 问题 | 影响范围 | 严重程度 |
|------|------|---------|---------|
| 智能场景配置 | AI场景未链接LLM/提示词 | 执行 AI 流程失败 | 🔴 高 |
| 供应商管理 | 缺少企业资质/商品信息 | 无法参与交易 | 🟠 中 |
| 商品数据 | 价格缺失、描述不完整 | 搜索推荐受影响 | 🟠 中 |
| 设计师数据 | 资格证书、作品集缺失 | 无法接单 | 🟠 中 |
| 提示词管理 | 不同LLM的提示词冲突 | 执行结果不可预测 | 🔴 高 |

### 4.2 解决方案架构

#### A. 数据验证层

```typescript
// src/lib/validators/data-consistency.ts

export interface DataValidationResult {
  isValid: boolean;
  missingFields: string[];
  inconsistencies: string[];
  warnings: string[];
  suggestions: string[];
}

export class DataValidator {
  /**
   * 验证 AI 场景配置完整性
   */
  static validateAIScenario(scenario: AIScenario): DataValidationResult {
    const issues: DataValidationResult = {
      isValid: true,
      missingFields: [],
      inconsistencies: [],
      warnings: [],
      suggestions: []
    };

    // 检查必填字段
    if (!scenario.name) issues.missingFields.push('场景名称');
    if (!scenario.description) issues.missingFields.push('场景描述');
    
    // 检查依赖关系
    if (!scenario.linkedLLMId) {
      issues.missingFields.push('关联的LLM');
      issues.suggestions.push('请在"管理后台">"LLM对接"中链接至少一个LLM');
    }

    if (!scenario.linkedPromptIds || scenario.linkedPromptIds.length === 0) {
      issues.missingFields.push('提示词');
      issues.suggestions.push('请创建并链接至少一个提示词');
    }

    // 检查逻辑一致性
    if (scenario.type === 'demand_clarification' && !scenario.clarificationFields) {
      issues.inconsistencies.push('需求澄清场景必须定义澄清字段');
    }

    issues.isValid = issues.missingFields.length === 0 && 
                     issues.inconsistencies.length === 0;

    return issues;
  }

  /**
   * 验证供应商信息完整性
   */
  static validateSupplier(supplier: Supplier): DataValidationResult {
    const issues: DataValidationResult = {
      isValid: true,
      missingFields: [],
      inconsistencies: [],
      warnings: [],
      suggestions: []
    };

    // 基本信息
    if (!supplier.name) issues.missingFields.push('企业名称');
    if (!supplier.address) issues.missingFields.push('企业地址');
    
    // 资质信息
    if (!supplier.creditCode && !supplier.registeredCapital) {
      issues.warnings.push('缺少企业资质信息');
      issues.suggestions.push('建议补全企业资质以提高信任度');
    }

    // 商品数据
    const hasProducts = (supplier.products?.length || 0) > 0;
    if (!hasProducts) {
      issues.warnings.push('未上传商品');
      issues.suggestions.push('请上传至少一个商品来展示您的服务');
    }

    issues.isValid = issues.missingFields.length === 0;

    return issues;
  }

  /**
   * 验证商品数据完整性
   */
  static validateProduct(product: ProductService): DataValidationResult {
    const issues: DataValidationResult = {
      isValid: true,
      missingFields: [],
      inconsistencies: [],
      warnings: [],
      suggestions: []
    };

    // 必填字段
    if (!product.name) issues.missingFields.push('商品名称');
    if (!product.price || product.price <= 0) issues.missingFields.push('有效的价格');
    if (!product.description || product.description.length < 10) {
      issues.warnings.push('商品描述过于简短');
      issues.suggestions.push('建议提供至少50字的详细描述以获得更好的推荐');
    }

    // 多媒体内容
    if (!product.images || product.images.length === 0) {
      issues.warnings.push('无产品图片');
      issues.suggestions.push('上传产品图片可显著提高转化率');
    }

    issues.isValid = issues.missingFields.length === 0;

    return issues;
  }
}
```

#### B. 数据修复服务

```typescript
// src/lib/services/data-repair.ts

export class DataRepairService {
  /**
   * 修复 AI 场景数据
   */
  static async repairAIScenario(
    scenarioId: string,
    fixes: Partial<AIScenario>
  ): Promise<AIScenario> {
    const scenario = await getAIScenario(scenarioId);
    
    // 应用修复
    const repaired = {
      ...scenario,
      ...fixes,
      updatedAt: new Date(),
      updatedBy: 'system-repair'
    };

    // 验证修复后的数据
    const validation = DataValidator.validateAIScenario(repaired);
    if (!validation.isValid) {
      throw new Error(`修复失败: ${validation.missingFields.join(', ')}`);
    }

    await updateAIScenario(scenarioId, repaired);
    
    return repaired;
  }

  /**
   * 批量修复供应商数据
   */
  static async batchRepairSuppliers(
    supplierIds: string[],
    repairStrategy: 'remove_incomplete' | 'auto_generate' | 'manual_review'
  ): Promise<{
    repaired: string[];
    removed: string[];
    needsReview: string[];
  }> {
    const result = {
      repaired: [] as string[],
      removed: [] as string[],
      needsReview: [] as string[]
    };

    for (const supplierId of supplierIds) {
      const supplier = await getSupplier(supplierId);
      const validation = DataValidator.validateSupplier(supplier);

      if (repairStrategy === 'remove_incomplete' && !validation.isValid) {
        await removeSupplier(supplierId);
        result.removed.push(supplierId);
      } else if (repairStrategy === 'auto_generate') {
        // 尝试从外部数据源补全
        const enriched = await enrichSupplierData(supplier);
        await updateSupplier(supplierId, enriched);
        result.repaired.push(supplierId);
      } else {
        result.needsReview.push(supplierId);
      }
    }

    return result;
  }
}
```

### 4.3 前端数据维护界面

#### 管理员仪表板 - 数据健康检查

```typescript
// src/app/admin/data-health/page.tsx

export default function DataHealthPage() {
  const [metrics, setMetrics] = useState<DataHealthMetrics>();
  const [issues, setIssues] = useState<DataIssue[]>([]);

  useEffect(() => {
    fetchDataHealth();
  }, []);

  const fetchDataHealth = async () => {
    const response = await fetch('/api/admin/data-health');
    const data = await response.json();
    
    setMetrics(data.metrics);
    setIssues(data.issues);
  };

  return (
    <div className="space-y-6">
      {/* 数据健康指标概览 */}
      <Card>
        <CardHeader>
          <CardTitle>数据健康概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              label="AI场景配置"
              complete={metrics?.aiScenariosComplete}
              total={metrics?.aiScenariosTotal}
              status={getHealthStatus(metrics?.aiScenariosComplete, metrics?.aiScenariosTotal)}
            />
            <MetricCard
              label="供应商信息"
              complete={metrics?.suppliersComplete}
              total={metrics?.suppliersTotal}
              status={getHealthStatus(metrics?.suppliersComplete, metrics?.suppliersTotal)}
            />
            <MetricCard
              label="商品数据"
              complete={metrics?.productsComplete}
              total={metrics?.productsTotal}
              status={getHealthStatus(metrics?.productsComplete, metrics?.productsTotal)}
            />
            <MetricCard
              label="提示词配置"
              complete={metrics?.promptsLinked}
              total={metrics?.promptsTotal}
              status={getHealthStatus(metrics?.promptsLinked, metrics?.promptsTotal)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 问题列表与修复工具 */}
      <Card>
        <CardHeader>
          <CardTitle>数据问题检测</CardTitle>
          <CardDescription>以下数据项存在完整性或一致性问题</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                accessorKey: 'type',
                header: '类型',
                cell: (row) => <Badge>{row.getValue()}</Badge>
              },
              {
                accessorKey: 'itemId',
                header: '项目ID',
              },
              {
                accessorKey: 'issues',
                header: '问题',
                cell: (row) => (
                  <div className="text-sm space-y-1">
                    {(row.getValue() as string[]).map(issue => (
                      <div key={issue} className="text-red-600">• {issue}</div>
                    ))}
                  </div>
                )
              },
              {
                accessorKey: 'suggestions',
                header: '建议',
                cell: (row) => (
                  <div className="text-sm space-y-1">
                    {(row.getValue() as string[]).map(suggestion => (
                      <div key={suggestion} className="text-blue-600">💡 {suggestion}</div>
                    ))}
                  </div>
                )
              },
              {
                id: 'actions',
                header: '操作',
                cell: (row) => (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEditItem(row.original)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveItem(row.original)}
                    >
                      删除
                    </Button>
                  </div>
                )
              }
            ]}
            data={issues}
          />
        </CardContent>
      </Card>

      {/* AI场景配置向导 */}
      <AIScenarioSetupWizard />

      {/* 提示词管理工具 */}
      <PromptManagementTool />
    </div>
  );
}
```

#### AI 场景配置向导

```typescript
// src/components/admin/ai-scenario-setup-wizard.tsx

export function AIScenarioSetupWizard() {
  const [step, setStep] = useState<'llm' | 'prompt' | 'scenario' | 'test'>('llm');
  const [formData, setFormData] = useState({
    selectedLLMId: '',
    promptIds: [] as string[],
    scenarioConfig: {}
  });

  const steps = [
    {
      id: 'llm',
      title: '1. 选择 LLM',
      description: '选择或配置一个可用的 LLM 连接',
      content: <LLMSelector value={formData.selectedLLMId} onChange={(v) => setFormData({...formData, selectedLLMId: v})} />
    },
    {
      id: 'prompt',
      title: '2. 选择提示词',
      description: '为这个 LLM 选择适用的提示词模板',
      content: <PromptSelector llmId={formData.selectedLLMId} value={formData.promptIds} onChange={(v) => setFormData({...formData, promptIds: v})} />
    },
    {
      id: 'scenario',
      title: '3. 配置场景',
      description: '设置智能场景的参数和行为',
      content: <ScenarioConfig {...formData.scenarioConfig} onChange={(v) => setFormData({...formData, scenarioConfig: v})} />
    },
    {
      id: 'test',
      title: '4. 测试',
      description: '测试这个配置是否正常工作',
      content: <ScenarioTester config={formData} />
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 场景配置向导</CardTitle>
        <CardDescription>按步骤配置 AI 场景，确保依赖关系完整</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 步骤指示 */}
        <div className="mb-6">
          <Stepper currentStep={step} steps={steps.map(s => s.title)} />
        </div>

        {/* 步骤内容 */}
        {steps.find(s => s.id === step)?.content}

        {/* 导航按钮 */}
        <div className="mt-6 flex justify-between">
          <Button
            disabled={step === 'llm'}
            onClick={() => setStep(steps[steps.findIndex(s => s.id === step) - 1].id as any)}
          >
            上一步
          </Button>
          <Button
            onClick={() => {
              if (step === 'test') {
                handleSaveScenario(formData);
              } else {
                setStep(steps[steps.findIndex(s => s.id === step) + 1].id as any);
              }
            }}
          >
            {step === 'test' ? '保存' : '下一步'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4.4 数据一致性检查 API

```typescript
// src/app/api/admin/data-health/route.ts

export async function GET(req: NextRequest) {
  try {
    const [
      aiScenariosHealth,
      suppliersHealth,
      productsHealth,
      promptsHealth
    ] = await Promise.all([
      checkAIScenarioHealth(),
      checkSupplierHealth(),
      checkProductHealth(),
      checkPromptHealth()
    ]);

    const metrics = {
      aiScenariosTotal: aiScenariosHealth.total,
      aiScenariosComplete: aiScenariosHealth.complete,
      suppliersTotal: suppliersHealth.total,
      suppliersComplete: suppliersHealth.complete,
      productsTotal: productsHealth.total,
      productsComplete: productsHealth.complete,
      promptsTotal: promptsHealth.total,
      promptsLinked: promptsHealth.linked
    };

    const issues = [
      ...aiScenariosHealth.issues,
      ...suppliersHealth.issues,
      ...productsHealth.issues,
      ...promptsHealth.issues
    ];

    return NextResponse.json({ metrics, issues });
  } catch (error) {
    return NextResponse.json(
      { error: '数据检查失败', details: String(error) },
      { status: 500 }
    );
  }
}

async function checkAIScenarioHealth() {
  const scenarios = await getAIScenarios();
  const issues: DataIssue[] = [];

  let complete = 0;
  for (const scenario of scenarios) {
    const validation = DataValidator.validateAIScenario(scenario);
    if (validation.isValid) {
      complete++;
    } else {
      issues.push({
        type: 'AI Scenario',
        itemId: scenario.id,
        issues: validation.missingFields,
        suggestions: validation.suggestions
      });
    }
  }

  return { total: scenarios.length, complete, issues };
}
```

---

## 📦 第五部分：部署检查清单

### 部署前最终检查

- [ ] **代码检查**
  - [ ] npm run typecheck 无错误
  - [ ] npm run build 成功
  - [ ] npm run lint 通过

- [ ] **环境配置**
  - [ ] 所有环境变量已在 TCB 控制台配置
  - [ ] API Key 和 Secret 已妥善保管
  - [ ] JWT Secret 使用强密钥

- [ ] **数据准备**
  - [ ] AI 场景配置完整（LLM + Prompt 链接）
  - [ ] 至少 1 个供应商有完整信息
  - [ ] 至少 1 个商品数据完整
  - [ ] 提示词库非空

- [ ] **健康检查**
  - [ ] /api/health 端点响应正常
  - [ ] 数据库连接正常
  - [ ] LLM 连接测试通过

- [ ] **功能验证**
  - [ ] 用户认证流程正常
  - [ ] AI 匹配流程可执行
  - [ ] 订单创建成功

- [ ] **安全检查**
  - [ ] 敏感信息未硬编码
  - [ ] API 认证正常
  - [ ] CORS 配置正确

- [ ] **性能验证**
  - [ ] 首页加载 < 3s
  - [ ] API 响应 < 1s
  - [ ] 数据库查询优化

---

**下一步**：按照本清单依次完成部署前准备工作
