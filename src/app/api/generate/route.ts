
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/services/db';

/**
 * LLM 网关路由
 * 逻辑:
 *  1. 读取请求 body (model, messages, temperature, category 可选)
 *  2. 从 TCB 集合 `llm_connections` 中筛选 status === '活跃'
 *  3. 若请求指定 model: 精确匹配 modelName；否则按 (category=>优先) 与 priority 升序选择最高优先级
 *  4. 未找到 => 503 { message: '需要先配置LLM' }
 *  5. 找到连接 => 组装代理请求 (当前仍使用 OpenAI 风格 /chat/completions 作为统一适配层)
 *  6. 返回模型响应或错误
 * 说明: apiBaseUrl / apiKey 字段可能在存储中为空, 生产中需由管理后台安全写入。
 */

type RawLlmConnection = {
    provider: string;
    modelName: string;
    apiKey?: string;
    priority: number;
    status: string; // 期望值 '活跃'
    scope?: string;
    category?: string; // 文本 / 图像 / 其他
    apiBaseUrl?: string; // 可选: 若未提供使用 provider 推断或默认 OpenAI
};

function pickBestConnection(list: RawLlmConnection[], desiredModel?: string, desiredCategory?: string) {
    const active = list.filter(c => c.status === '活跃');
    if (active.length === 0) return null;
    if (desiredModel) {
        const exact = active.find(c => c.modelName === desiredModel);
        if (exact) return exact;
    }
    let filtered = active;
    if (desiredCategory) {
        const catMatches = active.filter(c => c.category === desiredCategory);
        if (catMatches.length > 0) filtered = catMatches; // 若分类有匹配则缩小集合
    }
    // priority 数值小代表更高优先级（假设如此；如相反可反转排序）
    return filtered.sort((a, b) => a.priority - b.priority)[0] || null;
}

function inferApiBaseUrl(conn: RawLlmConnection): string {
    if (conn.apiBaseUrl) return conn.apiBaseUrl;
    // 简要映射 (需要根据实际各家 API 进行完善) 目前统一返回 OpenAI 风格 endpoint
    const provider = conn.provider.toLowerCase();
    if (provider.includes('openai')) return 'https://api.openai.com/v1';
    if (provider.includes('tencent')) return 'https://api.openai.com/v1'; // TODO: 替换为腾讯混元官方兼容网关
    if (provider.includes('anthropic')) return 'https://api.openai.com/v1';
    if (provider.includes('google')) return 'https://api.openai.com/v1';
    return 'https://api.openai.com/v1';
}

export async function POST(req: NextRequest) {
    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ message: '请求体必须是 JSON' }, { status: 400 });
        }
        const { model, messages, temperature, category } = body || {};
        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ message: 'messages 必须是数组' }, { status: 400 });
        }

        const db = getDb();
        // 读取前 200 条连接（可根据需要分页或上限）
        const raw = await db.collection('llm_connections').limit(200).get();
        const connections: RawLlmConnection[] = (raw?.data || []).map((d: any) => ({
            provider: d.provider,
            modelName: d.modelName,
            apiKey: d.apiKey,
            status: d.status,
            priority: typeof d.priority === 'number' ? d.priority : 9999,
            scope: d.scope,
            category: d.category,
            apiBaseUrl: d.apiBaseUrl,
        }));

        const chosen = pickBestConnection(connections, model, category);
        if (!chosen) {
            return NextResponse.json(
                {
                    message: '需要先配置LLM',
                    details: '未找到满足条件的活跃 LLM 连接，请在后台添加或激活至少一个连接。'
                },
                { status: 503 }
            );
        }
        if (!chosen.apiKey || chosen.apiKey.trim() === '') {
            return NextResponse.json(
                { message: '已选 LLM 连接缺少 apiKey', provider: chosen.provider, modelName: chosen.modelName },
                { status: 500 }
            );
        }

        const proxyUrl = inferApiBaseUrl(chosen);
        const requestBody = {
            model: model || chosen.modelName, // 若未指定 model 使用连接的模型名称
            messages,
            temperature: temperature ?? 0.7,
        };

        const response = await fetch(`${proxyUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${chosen.apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[LLM Gateway] Upstream Error:', errorBody);
            return new NextResponse(
                JSON.stringify({
                    message: 'LLM 上游请求失败',
                    upstreamStatus: response.status,
                    upstreamBody: errorBody?.slice(0, 500),
                }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        return NextResponse.json({
            gateway: {
                provider: chosen.provider,
                modelName: chosen.modelName,
                category: chosen.category,
                priority: chosen.priority,
            },
            data,
        });
    } catch (error: any) {
        console.error('[LLM Gateway] Internal Error:', error);
        const msg = (error?.cause as any)?.code === 'UND_ERR_CONNECT_FAILED'
            ? '无法连接到已配置的 LLM 提供商'
            : error?.message || '未知错误';
        return NextResponse.json({ message: '处理 AI 请求时出错', details: msg }, { status: 500 });
    }
}
