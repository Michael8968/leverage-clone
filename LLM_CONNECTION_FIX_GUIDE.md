# LLM连接功能恢复指南

## 问题描述
LLM连接功能出现问题：之前可选择的LLM和版本下拉菜单现在没有显示，可用性测试功能也失效。

## 问题原因
`llm_connections` 数据库集合不存在或为空，导致下拉菜单无法加载LLM选项。

## 解决方案

### 本地开发环境
本地环境已自动修复，LLM连接数据已准备就绪。

### 生产环境 (TCB)

#### 方法1：通过TCB控制台手动添加

1. **登录TCB控制台**
   - 访问: https://console.cloud.tencent.com/tcb/env/index
   - 选择环境: `leverage-test-abc123-9bn41a84185`

2. **创建数据库集合**
   - 进入 "数据库" → "集合管理"
   - 点击 "新建集合"
   - 集合名称: `llm_connections`
   - 点击 "确定"

3. **添加LLM连接记录**
   - 选择 `llm_connections` 集合
   - 点击 "添加文档"
   - 添加以下记录（建议按优先级从低到高添加）：

```json
{
  "provider": "Tencent",
  "modelName": "hunyuan-standard",
  "apiKey": "你的混元API密钥",
  "priority": 1,
  "status": "活跃",
  "scope": "通用",
  "category": "文本",
  "lastTestStatus": "untested",
  "createdAt": {
    "$date": "2025-10-29T07:43:54.030Z"
  }
}
```

```json
{
  "provider": "Tencent",
  "modelName": "hunyuan-pro",
  "apiKey": "你的混元API密钥",
  "priority": 2,
  "status": "活跃",
  "scope": "通用",
  "category": "文本",
  "lastTestStatus": "untested",
  "createdAt": {
    "$date": "2025-10-29T07:43:54.031Z"
  }
}
```

```json
{
  "provider": "OpenAI",
  "modelName": "gpt-4o",
  "apiKey": "你的OpenAI API密钥",
  "priority": 10,
  "status": "活跃",
  "scope": "通用",
  "category": "文本",
  "lastTestStatus": "untested",
  "createdAt": {
    "$date": "2025-10-29T07:43:54.031Z"
  }
}
```

#### 方法2：通过管理员面板添加（推荐）

1. **登录管理员账号**
   - 访问生产环境: https://leverage-test-abc123-9bn41a84185.app.tcloudbase.com
   - 登录管理员账号

2. **进入LLM对接页面**
   - 点击左侧菜单 "LLM 对接"
   - 或直接访问: `/admin-dashboard`

3. **添加LLM连接**
   - 点击 "添加新连接"
   - 填写以下信息：
     - 厂商: Tencent
     - 模型名称: hunyuan-standard
     - API Key: 你的混元API密钥
     - 优先级: 1
     - 状态: 活跃
     - 范围: 通用
     - 类别: 文本
   - 点击 "保存"

4. **重复添加其他模型**
   - hunyuan-pro (优先级: 2)
   - gpt-4o (优先级: 10)
   - deepseek-chat (优先级: 20)

## 验证修复

### 检查下拉菜单
1. 访问提示词管理页面: `/prompt-management`
2. 点击 "新增提示词"
3. 检查 "绑定模型" 下拉菜单是否显示LLM选项

### 测试可用性
1. 在管理员面板中选择一个LLM连接
2. 点击 "可用性测试" 按钮
3. 确认测试结果为成功

### 功能测试
1. 创建一个新的提示词
2. 在 "绑定模型" 字段选择一个LLM
3. 保存提示词
4. 确认保存成功

## 故障排除

### 如果下拉菜单仍不显示
- 检查 `llm_connections` 集合是否存在
- 确认至少有一个状态为 "活跃" 的记录
- 检查浏览器控制台是否有错误信息

### 如果测试失败
- 确认API密钥正确
- 检查网络连接
- 查看TCB云日志了解详细错误信息

### 如果保存失败
- 检查数据库权限
- 确认集合结构正确
- 查看浏览器开发者工具的网络标签

## 相关文件
- 本地数据: `data/llm_connections.json`
- 管理页面: `src/app/admin-dashboard/page.tsx`
- 提示词页面: `src/app/prompt-management/page.tsx`
- 检查脚本: `scripts/check-llm-connections.ts`
- 初始化脚本: `scripts/seed-llm-connections.ts`