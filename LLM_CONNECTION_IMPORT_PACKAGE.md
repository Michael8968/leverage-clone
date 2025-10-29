## LLM 连接数据导入包 (预设目录版)

### 📦 导入文件
位置: `data/llm_connections.csv`

### 📋 数据内容 (68个LLM连接模板 - CSV格式)
```json
[JSON数据已复制到剪贴板，请直接粘贴]
```

### 🚀 手动导入步骤

#### 1. 登录 TCB 控制台
```
https://console.cloud.tencent.com/tcb
```

#### 2. 选择环境
- 选择你的环境ID（通常是 `${process.env.TCB_ENV_ID}`）

#### 3. 创建集合
- 点击左侧菜单 "数据库" → "数据管理"
- 点击 "创建集合"
- 集合名称输入: `llm_connections`
- 权限设置: 选择 "所有用户可读写"（或根据需要设置）
- 点击 "确定"

#### 4. 导入数据
- 在 `llm_connections` 集合页面
- 点击右上角 "导入数据"
- 选择格式: `CSV`
- 在数据输入框中粘贴CSV数据
- **注意**: 第一行为表头字段名，后续每行为一条记录
- 点击 "确定" 导入

#### 5. 确认导入
- 刷新页面查看数据
- 应该显示68条记录，所有API密钥字段为空

### ⚠️ 重要提醒

### TCB导入格式要求
- **使用 CSV 格式**（逗号分隔值）
- **第一行为表头**，包含字段名: provider,modelName,apiKey,priority,status,scope,category,lastTestStatus,createdAt
- **后续每行为一条记录**
- **字段值中的逗号会被自动处理**

### API密钥管理
- **所有API密钥字段都是空的** - 这是正确的设计
- 用户需要在管理界面中手工填入API密钥
- 这样可以确保安全性，避免在配置文件中存储敏感信息

### 预设模型目录
系统已经内置了完整的LLM提供商和模型目录：
- Tencent: hunyuan-standard, hunyuan-pro, hunyuan-lite, hunyuan-turbo
- OpenAI: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo
- Anthropic: claude-3-opus, claude-3-sonnet, claude-3-haiku, claude-3-5-sonnet
- Google: gemini-1.5-pro, gemini-1.5-flash等
- 以及其他10多家主流提供商

### 权限设置
确保集合权限允许你的应用正常读写数据。

## 🔍 验证步骤

导入完成后：

1. 访问你的应用管理员面板
2. 查看LLM连接管理页面
3. 确认显示68个连接模板（API密钥为空）
4. 从下拉菜单中选择提供商和模型
5. 填入对应的API密钥
6. 点击"可用性测试"验证连接

## 💡 使用说明

### 添加新连接
1. 在管理界面点击"添加LLM连接"
2. 从"提供商"下拉菜单选择提供商
3. 从"模型"下拉菜单选择具体模型
4. 填入API密钥
5. 保存连接

### 目录扩展
如果预设目录中没有你需要的模型，可以：
1. 在提供商下拉菜单中选择"其他"
2. 手工输入提供商名称和模型名称
3. 填入API密钥和自定义API地址

---

*导入时间: 2025-10-29*
*数据版本: v5.0 (CSV格式)*