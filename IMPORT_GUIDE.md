# 🚀 LLM连接数据导入指南 (预设目录版)

## 📋 快速导入步骤

### 1. 访问TCB控制台
```
https://console.cloud.tencent.com/tcb
```

### 2. 选择环境
- 选择你的环境ID（通常是 `${process.env.TCB_ENV_ID}`）

### 3. 创建集合
- 点击左侧菜单 "数据库" → "数据管理"
- 点击 "创建集合"
- 集合名称输入: `llm_connections`
- 权限设置: 选择 "所有用户可读写"（或根据需要设置）
- 点击 "确定"

### 4. 导入数据
- 在 `llm_connections` 集合页面
- 点击右上角 "导入数据"
- 选择格式: `CSV`
- 在数据输入框中粘贴以下CSV数据：

```csv
[CSV数据已复制到剪贴板，请直接粘贴 - 第一行为表头，后续每行为一条记录]
```

### 5. 确认导入
- 点击 "确定" 开始导入
- 等待导入完成

### 6. 验证导入
- 刷新页面查看数据
- 应该显示68条记录（所有API密钥为空）

## ⚠️ 重要提醒

### API密钥安全设计
- **所有API密钥字段都是空的字符串 `""`** - 这是正确的安全设计
- 用户需要在管理界面中**手工填入**API密钥
- 避免在配置文件或数据库中明文存储敏感信息

### 预设模型目录
系统已内置完整的LLM提供商和模型目录：
- **Tencent**: hunyuan-standard, hunyuan-pro, hunyuan-lite, hunyuan-turbo
- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo
- **Anthropic**: claude-3-opus, claude-3-sonnet, claude-3-haiku, claude-3-5-sonnet
- **Google**: gemini-1.5-pro, gemini-1.5-flash等最新模型
- **DeepSeek**: deepseek-chat, deepseek-coder
- **国内厂商**: 百度文心一言、讯飞星火、字节跳动、华为云等
- **其他**: Baichuan, Moonshot, Alibaba, Zhipu等

### 权限设置
确保集合权限允许你的应用正常读写数据。

### 🔍 验证步骤

导入完成后：

1. 访问你的应用管理员面板
2. 查看LLM连接管理页面
3. 确认显示68个连接模板（API密钥列显示为空）
4. 从下拉菜单中选择提供商和模型
5. 填入对应的API密钥
6. 点击"可用性测试"验证连接

## ⚠️ 重要格式说明

### TCB导入格式要求
- **使用 CSV 格式**（逗号分隔值）
- **第一行为表头**，包含字段名
- **后续每行为一条记录**
- **字段顺序**: provider,modelName,apiKey,priority,status,scope,category,lastTestStatus,createdAt

## 💡 使用说明

### 添加新连接的正确流程
1. 在管理界面点击"添加LLM连接"
2. 从"提供商"下拉菜单选择提供商（如：OpenAI, Tencent, Anthropic等）
3. 从"模型"下拉菜单选择具体模型版本
4. 在"API密钥"字段手工填入真实的API密钥
5. 可选：设置优先级、状态等参数
6. 保存连接

### 目录扩展
如果预设目录中没有你需要的模型：
1. 在提供商下拉菜单中选择"其他"或手工输入
2. 手工输入提供商名称和模型名称
3. 填入API密钥和自定义API地址（如有需要）

### 安全建议
- 定期更换API密钥
- 不要在代码或配置文件中存储API密钥
- 使用环境变量或安全的密钥管理服务

---

*导入时间: 2025-10-29*
*数据版本: v5.0 (CSV格式)*
*设计理念: 安全第一，目录先行*