# TCB错误处理简化版本使用指南

## 概述

根据您的示例，我们创建了一个简化版本的错误处理模块，更符合实际使用需求。

## 核心函数

### `handleTCBError(error)` - 便捷错误处理函数

```javascript
const { handleTCBError } = require('../../scripts/tcb-error-handler-simple');

// 在try-catch中使用
try {
  // 你的逻辑，如 db.collection('demands').get()
  const result = await db.collection('demands').get();
} catch (error) {
  // 直接使用便捷函数处理错误
  const friendlyError = handleTCBError(error);
  return friendlyError; // { success: false, message: '...', action: {...} }
}
```

## 错误映射表

| 错误码 | 友好提示 | 操作 |
|--------|----------|------|
| `DATABASE_COLLECTION_NOT_EXIST` | "数据加载中，请稍后重试~" | 跳转到 `/dashboard` |
| `AUTH_PERMISSION_ERR` | "登录状态小调整，请重新登录。" | 跳转到 `/login` |
| `NETWORK_ERROR` | "网络连接不太稳定，请稍后重试。" | 重试 |
| `INTERNAL_ERROR` | "服务暂时不可用，请稍后重试。" | 重试 |
| 其他 | "出现技术问题，请联系开发人员。" | 重试 |

## 在云函数中使用

### 完整示例

```javascript
const cloudbase = require('@cloudbase/node-sdk');
const { handleTCBError } = require('../../scripts/tcb-error-handler-simple');

exports.main = async (event, context) => {
  // CORS预检处理
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin': '*'} };
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  try {
    // 初始化TCB
    const app = cloudbase.init({
      env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
    });

    const db = app.database();

    // 你的业务逻辑
    const result = await db.collection('demands').get();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: '操作成功',
        data: result
      }),
    };

  } catch (error) {
    console.error('处理失败:', error);

    // 使用简化错误处理
    const friendlyError = handleTCBError(error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(friendlyError)
    };
  }
};
```

### 手动条件判断方式

如果你喜欢更直接的控制，可以使用条件判断：

```javascript
try {
  // 你的逻辑
} catch (error) {
  let friendlyMsg = '出现技术问题，请联系开发人员。';
  let action = { type: 'retry' };

  if (error.code === 'DATABASE_COLLECTION_NOT_EXIST') {
    friendlyMsg = '数据加载中，请稍后重试~';
    action = { type: 'redirect', to: '/dashboard' };
  } else if (error.code === 'AUTH_PERMISSION_ERR') {
    friendlyMsg = '登录状态小调整，请重新登录。';
    action = { type: 'redirect', to: '/login' };
  }

  return { success: false, message: friendlyMsg, action };
}
```

## 前端处理

### React组件中的使用

```javascript
import React from 'react';

function MyComponent() {
  const [error, setError] = React.useState(null);

  const handleAPIError = (errorResponse) => {
    if (errorResponse.action?.type === 'redirect') {
      window.location.href = errorResponse.action.to;
    } else if (errorResponse.action?.type === 'retry') {
      // 执行重试逻辑
      loadData();
    }

    setError(errorResponse.message);
  };

  const loadData = async () => {
    try {
      const response = await fetch('/api/endpoint');
      const data = await response.json();

      if (!data.success) {
        handleAPIError(data);
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={loadData}>加载数据</button>
    </div>
  );
}
```

## 测试验证

运行测试验证功能：

```bash
npm test -- scripts/tcb-error-handler-simple.test.js
```

## 优势

1. **简洁直接**: 符合您的示例风格，代码清晰易懂
2. **统一格式**: 返回格式完全一致 `{success, message, action}`
3. **易于维护**: 错误映射集中管理
4. **灵活扩展**: 可以轻松添加新的错误类型
5. **前端友好**: action字段支持自动跳转和重试

## 扩展错误类型

如需添加新的错误处理：

```javascript
// 在 handleTCBError 函数中添加新的条件
} else if (error.code === 'NEW_ERROR_CODE') {
  friendlyMsg = '新的友好提示';
  action = { type: 'redirect', to: '/new-path' };
}
```

这个简化版本完全符合您的需求，既保持了简洁性，又提供了必要的错误处理功能。