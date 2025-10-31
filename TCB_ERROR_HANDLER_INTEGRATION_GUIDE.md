# TCB生产环境错误处理优化指南

## 概述

本指南介绍如何在所有TCB云函数中集成全局错误处理模块，将TCB默认错误转换为友好提示，保持产品惊喜调性。

## 核心组件

### 1. 后端错误处理模块 (`scripts/tcb-error-handler.js`)

- **功能**: 将TCB错误码映射为友好提示
- **特点**: 统一错误格式，自动重试/跳转逻辑
- **调性**: 保持友好、轻松的语气，避免技术术语

### 2. 前端错误处理模块 (`scripts/tcb-frontend-error-handler.js`)

- **功能**: Axios拦截器，处理API响应错误
- **特点**: 自动重试，UI友好提示
- **集成**: React Hook和组件示例

### 3. 测试用例 (`scripts/tcb-error-handler.test.js`)

- **覆盖**: 17个测试用例，涵盖各种错误场景
- **验证**: 错误映射、HTTP响应、异步包装等

## 错误映射表

| 错误码 | 友好提示 | 操作 |
|--------|----------|------|
| `DATABASE_COLLECTION_NOT_EXIST` | 数据服务暂时不可用，请稍后再试哦~ | 重试(2s) |
| `AUTH_PERMISSION_ERR` | 登录状态已过期，请重新登录哦~ | 跳转登录页 |
| `NETWORK_ERROR` | 网络连接不太稳定，请检查网络后重试~ | 重试(3s) |
| `AI_QUOTA_EXCEEDED` | AI使用额度已用完，请升级会员享受更多服务~ | 跳转定价页 |
| `INTERNAL_ERROR` | 服务暂时出现小问题，请稍后再试哦~ | 重试(3s) |

## 集成步骤

### 步骤1: 云函数集成

在每个云函数的 `index.js` 中：

```javascript
// 1. 导入错误处理模块
const { errorHandler } = require('../../scripts/tcb-error-handler');

// 2. 替换原来的 try-catch 结构
exports.main = async (event, context) => {
  // CORS预检处理
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: {'Access-Control-Allow-Origin': '*'} };

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // 使用错误处理模块包装主要业务逻辑
  return await errorHandler.wrapAsync(async () => {
    // 你的业务逻辑代码
    // ...

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: '操作成功啦~',
        data: result
      }),
    };
  }, corsHeaders);
};
```

### 步骤2: 前端集成

#### Axios配置

```javascript
import axios from 'axios';
import { setupAxiosInterceptors } from '../scripts/tcb-frontend-error-handler';

// 创建配置好的axios实例
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  timeout: 30000,
});

// 设置拦截器
setupAxiosInterceptors(apiClient);

export default apiClient;
```

#### React Hook使用

```javascript
import { useTCBErrorHandler } from '../hooks/use-tcb-error';

function MyComponent() {
  const { error, isRetrying, handleAPIError, clearError } = useTCBErrorHandler();

  const loadData = async () => {
    try {
      const result = await apiClient.get('/endpoint');
      // 处理成功结果
    } catch (error) {
      handleAPIError(error, loadData); // 自动重试
    }
  };

  // 渲染错误UI
  if (error) {
    return (
      <div>
        <p>{error.friendlyMessage}</p>
        {error.action?.type === 'retry' && (
          <button onClick={loadData} disabled={isRetrying}>
            {isRetrying ? '重试中...' : '重试'}
          </button>
        )}
      </div>
    );
  }

  return <div>正常内容</div>;
}
```

## 部署清单

### 已完成的函数

- ✅ `getPlatformAssets` - 已集成错误处理
- ⏳ 其他17个函数 - 需要批量集成

### 批量集成脚本

```bash
# 运行批量集成脚本（需要创建）
npm run integrate-error-handler
```

### 验证步骤

1. **语法检查**: 对所有函数运行 `node -c`
2. **单元测试**: 运行 `npm test -- scripts/tcb-error-handler.test.js`
3. **集成测试**: 部署后运行API测试套件
4. **端到端测试**: 前端调用API验证错误处理

## 监控和维护

### 错误日志分析

```javascript
// 在错误处理模块中添加日志
console.error('原始错误:', error);
console.log('错误码:', errorCode);
```

### 错误率监控

- 设置CloudWatch或TCB监控告警
- 关注高频错误码和趋势
- 根据用户反馈调整错误提示

### 定期更新

- 根据新错误模式更新映射表
- 添加新的错误码处理
- 优化重试策略和延迟时间

## 最佳实践

### 1. 保持调性一致性

所有错误消息都应：
- 使用友好语气词（哦、呢、吧、啦、~）
- 避免技术术语
- 提供明确的后续操作指引

### 2. 错误分类处理

- **可重试错误**: 网络超时、临时服务不可用
- **用户操作错误**: 权限不足、输入验证失败
- **系统错误**: 内部错误、配置问题

### 3. 用户体验优化

- 自动重试非破坏性操作
- 清晰的错误状态显示
- 友好的加载和重试UI

## 故障排除

### 常见问题

1. **错误消息显示为英文**
   - 检查错误处理模块是否正确导入
   - 确认错误码映射是否完整

2. **重试逻辑不工作**
   - 验证前端错误拦截器配置
   - 检查action字段格式

3. **CORS错误**
   - 确保错误响应包含正确的CORS头
   - 检查预检请求处理

### 调试技巧

```javascript
// 临时启用详细日志
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) {
  console.log('错误详情:', { error, errorCode, friendlyError });
}
```

## 总结

通过全局错误处理模块，我们实现了：

1. **统一错误格式**: 所有API返回一致的错误响应结构
2. **友好用户体验**: 技术错误转换为易懂的提示
3. **自动化处理**: 自动重试和页面跳转
4. **可维护性**: 集中管理错误映射和处理逻辑
5. **产品调性**: 保持轻松、友好的品牌形象

这将显著提升生产环境的用户体验和系统稳定性。