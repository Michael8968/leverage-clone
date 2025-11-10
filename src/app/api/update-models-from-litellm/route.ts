
import { NextResponse } from 'next/server';
import { db } from '@/lib/tcb';

const llmConnectionsCollection = db.collection('llm_connections');

export async function POST() {
    const litellmProxyUrl = process.env.LITELLM_PROXY_URL;

    if (!litellmProxyUrl) {
        return NextResponse.json({ message: 'LiteLLM代理URL未配置' }, { status: 400 });
    }

    try {
        const response = await fetch(`${litellmProxyUrl}/v1/models`);
        const { data } = await response.json();

        const existingConnections = await llmConnectionsCollection.get();
        const existingModels = new Set(existingConnections.data.map((c: any) => c.modelName));

        let addedCount = 0;
        for (const model of data) {
            if (!existingModels.has(model.id)) {
                await llmConnectionsCollection.add({
                    provider: 'LiteLLM',
                    modelName: model.id,
                    apiKey: ''
                });
                addedCount++;
            }
        }

        return NextResponse.json({ message: `成功同步模型，新增${addedCount}个模型` });
    } catch (error: any) {
        return NextResponse.json({ message: `从LiteLLM同步模型失败: ${error.message}` }, { status: 500 });
    }
}
