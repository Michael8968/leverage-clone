
import { NextResponse } from 'next/server';

export async function GET() {
    const assets = {
        providers: [
            { providerName: 'Tencent', models: ['hunyuan-pro', 'hunyuan-standard'] },
            { providerName: 'OpenAI', models: ['gpt-4', 'gpt-3.5-turbo'] },
            { providerName: 'Anthropic', models: ['claude-2', 'claude-instant-1'] },
            { providerName: 'Google', models: ['gemini-pro'] },
            { providerName: 'DeepSeek', models: ['deepseek-coder', 'deepseek-llm'] },
            { providerName: 'Baichuan', models: ['Baichuan2-53B'] },
            { providerName: 'Moonshot', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
            { providerName: 'Alibaba', models: ['qwen-turbo', 'qwen-plus', 'qwen-max'] },
            { providerName: 'Zhipu', models: ['glm-4', 'glm-3-turbo'] },
            { providerName: 'MiniMax', models: ['abab5.5-chat'] },
            { providerName: '阶跃星辰', models: ['step-1-8k'] },
            { providerName: '字节跳动', models: ['skylark-chat'] },
            { providerName: '讯飞星火', models: ['Spark-Lite', 'Spark-Pro'] },
            { providerName: '百度文心一言', models: ['ERNIE-Bot-4.0', 'ERNIE-Bot-turbo'] },
            { providerName: 'LiteLLM', models: ['litellm-proxy'] }
        ]
    };
    return NextResponse.json(assets);
}
