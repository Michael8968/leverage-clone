# TCB API转换工具

将Firebase云函数转换为腾讯云Base (TCB) API端点的自动化工具。

## 功能特性

- 🔄 **一键转换**: 将Firebase云函数转为TCB API端点
- 🛡️ **完整集成**: 自动添加CORS、认证检查、错误处理
- 🤖 **AI友好**: 支持AI服务集成
- 🧪 **测试就绪**: 自动生成Postman测试集合
- 📝 **标准化**: 统一的API响应格式和错误处理

## 使用方法

```bash
node scripts/convert-firebase-to-tcb-api.js <functionName> <category> <inputDesc> <outputDesc> [aiIntegration]
```

### 参数说明

- `functionName`: 云函数名称
- `category`: API分类 (如: shopping, ai, user等)
- `inputDesc`: 输入数据描述
- `outputDesc`: 输出数据描述
- `aiIntegration`: 可选的AI集成描述

### 示例

```bash
# AI导购产品推荐
node scripts/convert-firebase-to-tcb-api.js recommendProducts shopping "用户偏好和预算信息" "个性化产品推荐列表" "AI导购"

# 用户画像分析
node scripts/convert-firebase-to-tcb-api.js analyzeUserProfile user "用户行为数据" "用户画像分析结果" "AI分析"

# 智能搜索
node scripts/convert-firebase-to-tcb-api.js smartSearch search "搜索关键词和上下文" "智能搜索结果" "语义搜索"
```

## 生成的文件

每次转换会生成以下文件:

1. **`functions/{functionName}/index.js`** - TCB云函数代码
2. **`scripts/{functionName}-postman-test.json`** - Postman测试集合

## API规范

### 请求格式

```http
POST /api/v1/{category}/{functionName}
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  // 你的请求数据
}
```

### 响应格式

#### 成功响应
```json
{
  "success": true,
  "message": "操作成功啦~",
  "data": {
    // 业务数据
  }
}
```

#### 错误响应
```json
{
  "success": false,
  "message": "友好的错误提示~",
  "error": "ERROR_CODE"
}
```

### 错误码

- `UNAUTHORIZED`: 未登录
- `VALIDATION_FAILED`: 输入验证失败
- `INTERNAL_ERROR`: 服务器内部错误

## 部署步骤

1. **编辑业务逻辑**
   ```bash
   # 编辑生成的云函数代码
   code functions/{functionName}/index.js
   ```

2. **更新配置**
   ```json
   // cloudbaserc.json 已自动更新
   {
     "functions": [
       {
         "name": "{functionName}",
         "timeout": 30,
         "memorySize": 256,
         "runtime": "Nodejs18.15",
         "handler": "index.main"
       }
     ]
   }
   ```

3. **部署函数**
   ```bash
   # 安装TCB CLI (如果还没安装)
   npm install -g @cloudbase/cli

   # 部署函数
   tcb functions:deploy {functionName}
   ```

4. **测试API**
   ```bash
   # 导入Postman测试集合
   # scripts/{functionName}-postman-test.json
   ```

## 特性说明

### 🔐 认证检查
- 自动验证JWT token
- 支持Bearer token格式
- 友好的未登录提示

### 🌐 CORS支持
- 自动处理OPTIONS预检请求
- 支持跨域访问
- 可配置的CORS策略

### 🛡️ 错误处理
- 统一的错误响应格式
- 友好的中文错误提示
- 详细的错误日志记录

### 🤖 AI集成
- 支持各种AI服务集成
- 预留AI调用接口
- 可扩展的AI服务架构

## 项目结构

```
functions/
├── {functionName}/
│   └── index.js              # 云函数代码
scripts/
├── convert-firebase-to-tcb-api.js  # 转换工具
└── {functionName}-postman-test.json # Postman测试
```

## 注意事项

1. 生成的代码包含TODO注释，需要根据实际需求完善业务逻辑
2. 确保TCB环境变量正确配置
3. 测试前请先部署云函数
4. Postman测试中的baseUrl需要替换为实际域名

## 相关链接

- [腾讯云Base文档](https://cloud.tencent.com/document/product/876)
- [Postman测试工具](https://www.postman.com/)
- [JWT认证标准](https://jwt.io/)