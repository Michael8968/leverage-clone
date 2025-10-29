const fs = require('fs');
const path = require('path');

// 从 admin-management-flows.ts 中提取的 PLATFORM_ASSETS 数据
const PLATFORM_ASSETS = {
    providers: [
  { providerName: "Tencent", models: ["hunyuan-standard", "hunyuan-pro", "hunyuan-lite", "hunyuan-turbo"], apiBaseUrl: "https://api.hunyuan.cloud.tencent.com/v1" },
  { providerName: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "gpt-3.5-turbo-16k"], apiBaseUrl: "https://api.openai.com/v1" },
  { providerName: "Anthropic", models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307", "claude-3-5-sonnet-20240620"], apiBaseUrl: "https://api.anthropic.com/v1" },
  { providerName: "Google", models: ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro", "gemini-pro-vision"], apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/models" },
  { providerName: "DeepSeek", models: ["deepseek-chat", "deepseek-coder"], apiBaseUrl: "https://api.deepseek.com/v1" },
  { providerName: "Baichuan", models: ["Baichuan2-Turbo", "Baichuan2-Turbo-192k", "Baichuan-Text-Embedding"], apiBaseUrl: "https://api.baichuan-ai.com/v1" },
  { providerName: "Moonshot", models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"], apiBaseUrl: "https://api.moonshot.cn/v1" },
  { providerName: "Alibaba", models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-max-longcontext"], apiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { providerName: "Zhipu", models: ["glm-4", "glm-3-turbo", "glm-4v", "zhipu-xl"], apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { providerName: "智谱GLM", models: ["glm-4-plus", "glm-4-air", "glm-4-airx", "glm-4-flash"], apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { providerName: "MiniMax", models: ["abab6.5-chat", "abab6.5s-chat", "abab5.5-chat"], apiBaseUrl: "https://api.minimax.chat/v1" },
  { providerName: "阶跃星辰", models: ["step-1-8k", "step-1-32k", "step-1-128k"], apiBaseUrl: "https://api.stepfun.com/v1" },
  { providerName: "字节跳动", models: ["Doubao-lite-4k", "Doubao-lite-32k", "Doubao-pro-4k", "Doubao-pro-32k"], apiBaseUrl: "https://ark.cn-beijing.volces.com/api/v3" },
  { providerName: "讯飞星火", models: ["general", "generalv2", "generalv3", "pro-128k"], apiBaseUrl: "https://spark-api.xf-yun.com/v1" },
  { providerName: "百度文心一言", models: ["ernie-4.0", "ernie-3.5-8k", "ernie-lite-8k", "ernie-tiny-8k"], apiBaseUrl: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat" },
  { providerName: "华为云", models: ["mindstudio-v1.0", "mindstudio-v2.0"], apiBaseUrl: "https://inference-modelarts.cn-north-4.myhuaweicloud.com/v1" },
        {
          providerName: "LiteLLM",
          models: [
            "groq/llama3-70b-8192",
            "groq/llama3-8b-8192",
            "groq/gemma-7b-it",
            "ollama/llama3",
            "ollama/llama3-8b",
            "anthropic/claude-3-opus-20240229",
            "anthropic/claude-3-sonnet-20240229",
            "anthropic/claude-3-haiku-20240307"
          ],
          apiBaseUrl: process.env.LITELLM_PROXY_URL || "http://localhost:4000/v1"
        }
    ]
};

// 生成 LLM 连接数据
function generateLlmConnections() {
    const connections = [];
    let priority = 1;

    PLATFORM_ASSETS.providers.forEach(provider => {
        provider.models.forEach(model => {
            connections.push({
                provider: provider.providerName,
                modelName: model,
                apiKey: "", // 空字符串，用户需要手工填入
                priority: priority++,
                status: "活跃",
                scope: "通用",
                category: "文本",
                lastTestStatus: "untested",
                createdAt: new Date().toISOString()
            });
        });
    });

    return connections;
}

// 生成并保存JSON文件
function saveToJsonFile() {
    const connections = generateLlmConnections();
    const outputPath = path.join(__dirname, 'data', 'llm_connections.json');

    // 确保data目录存在
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(connections, null, 2), 'utf8');
    console.log(`✅ 已生成 ${connections.length} 个LLM连接配置`);
    console.log(`📁 文件保存到: ${outputPath}`);

    // 同时复制到剪贴板
    const jsonString = JSON.stringify(connections, null, 2);
    console.log('\n📋 JSON数据已准备好，可直接复制到TCB控制台导入');
    console.log('=' .repeat(50));
    console.log(jsonString);
}

// 执行生成
saveToJsonFile();