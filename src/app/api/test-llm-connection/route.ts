
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
    const { connection } = await request.json();

    if (!connection) {
        return NextResponse.json({ success: false, message: '无效的连接数据' }, { status: 400 });
    }

    const { provider, modelName, apiKey, apiBaseUrl } = connection;

    const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: apiBaseUrl || getApiBaseUrl(provider),
    });

    try {
        await openai.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 10,
        });
        return NextResponse.json({ success: true, message: '连接成功' });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: `连接失败: ${error.message}` }, { status: 500 });
    }
}

function getApiBaseUrl(provider: string): string {
    const providerMap: { [key: string]: string } = {
        'Tencent': 'https://api.hunyuan.cloud.tencent.com/v1',
        'OpenAI': 'https://api.openai.com/v1',
        'Anthropic': 'https://api.anthropic.com/v1',
        'Google': 'https://generativelanguage.googleapis.com/v1beta/models',
        'DeepSeek': 'https://api.deepseek.com/v1',
        'Baichuan': 'https://api.baichuan-ai.com/v1',
        'Moonshot': 'https://api.moonshot.cn/v1',
        'Alibaba': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        'Zhipu': 'https://open.bigmodel.cn/api/paas/v4',
        '智谱GLM': 'https://open.bigmodel.cn/api/paas/v4',
        'MiniMax': 'https://api.minimax.chat/v1',
        '阶跃星辰': 'https://api.stepfun.com/v1',
        '字节跳动': 'https://ark.cn-beijing.volces.com/api/v3',
        '讯飞星火': 'https://spark-api.xf-yun.com/v1',
        '百度文心一言': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
        '华为云': 'https://inference-modelarts.cn-north-4.myhuaweicloud.com/v1',
        'LiteLLM': process.env.LITELLM_PROXY_URL || 'http://localhost:4000/v1'
    };
    return providerMap[provider] || '';
}


