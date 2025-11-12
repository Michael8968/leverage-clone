import { NextResponse } from 'next/server';
import { getDb, getDbType } from '@/lib/services/db';
import { DataConsistencyValidator, DataHealthAnalyzer } from '@/lib/validators/data-consistency';

/**
 * @file /api/admin/data-health/route.ts
 * @description 数据健康检查 API
 * 集成 DataConsistencyValidator 与 DataHealthAnalyzer
 * 返回核心实体的数据完整性指标与详细问题列表
 */

// 支持的实体类型配置
const ENTITY_CONFIG: Array<{
  type: 'AIScenario' | 'Supplier' | 'Product' | 'Prompt';
  collection: string;
  validator: (item: any) => ReturnType<typeof DataConsistencyValidator.validateAIScenario> | ReturnType<typeof DataConsistencyValidator.validateSupplier> | ReturnType<typeof DataConsistencyValidator.validateProduct> | ReturnType<typeof DataConsistencyValidator.validatePrompt>;
  limit?: number;
}> = [
  {
    type: 'AIScenario',
    collection: 'ai_scenarios',
    validator: (item) => DataConsistencyValidator.validateAIScenario(item)
  },
  {
    type: 'Supplier',
    collection: 'suppliers',
    validator: (item) => DataConsistencyValidator.validateSupplier(item)
  },
  {
    type: 'Product',
    collection: 'products',
    validator: (item) => DataConsistencyValidator.validateProduct(item)
  },
  {
    type: 'Prompt',
    collection: 'prompts',
    validator: (item) => DataConsistencyValidator.validatePrompt(item)
  }
];

function sanitizeItem(raw: any) {
  if (!raw) return raw;
  const id = raw.id || raw._id || raw.scenarioId || raw.supplierId || raw.productId || raw.promptId || undefined;
  return { id, ...raw };
}

async function fetchCollection(collection: string) {
  // 生产以 TCB 为准，不再走 Firestore 分支
  try {
    const db = getDb() as any;
    const res = await db.collection(collection).limit(500).get();
    return (res?.data || []).map((d: any) => sanitizeItem(d));
  } catch (e) {
    return [];
  }
}

export async function GET(req: Request) {
  const t0 = Date.now();
  try {
  const dbType = getDbType() as 'tcb' | 'mock' | null;
    const url = new URL(req.url);
    const detailParam = url.searchParams.get('detail');
    const includeDetail = detailParam === 'true';

    // 并行抓取所有实体集合
    const rawEntityBatches = await Promise.all(
      ENTITY_CONFIG.map(cfg => fetchCollection(cfg.collection))
    );

    const entityResults: any[] = [];
    const metricsResults: any[] = [];

    for (let i = 0; i < ENTITY_CONFIG.length; i++) {
      const cfg = ENTITY_CONFIG[i];
      const items = rawEntityBatches[i];
  const validations = items.map((item: any) => cfg.validator(item));

      const metrics = await DataHealthAnalyzer.calculateHealthMetrics(items, cfg.type, cfg.validator);
      metricsResults.push({ type: cfg.type, metrics });

      if (includeDetail) {
        entityResults.push({
          type: cfg.type,
          total: items.length,
          validations
        });
      }
    }

    // 汇总总体健康情况
    const totalItems = metricsResults.reduce((sum, m) => sum + m.metrics.totalItems, 0);
    const healthyItems = metricsResults.reduce((sum, m) => sum + m.metrics.healthyItems, 0);
    const warningItems = metricsResults.reduce((sum, m) => sum + m.metrics.warningItems, 0);
    const criticalItems = metricsResults.reduce((sum, m) => sum + m.metrics.criticalItems, 0);

    const healthPercentage = totalItems === 0 ? 100 : (healthyItems / totalItems) * 100;

    const responsePayload: any = {
      ok: true,
      timestamp: new Date().toISOString(),
  dbType,
      summary: {
        totalItems,
        healthyItems,
        warningItems,
        criticalItems,
        healthPercentage: Number(healthPercentage.toFixed(2))
      },
      perEntity: metricsResults.map(m => ({
        type: m.type,
        ...m.metrics,
        healthPercentage: Number(m.metrics.healthPercentage.toFixed(2))
      })),
      durationMs: Date.now() - t0
    };

    if (includeDetail) {
      responsePayload.details = entityResults;
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error?.message || String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 预留：触发自动修复流程（未来扩展）
  return NextResponse.json({ ok: false, message: 'Auto-repair not implemented yet' }, { status: 501 });
}
