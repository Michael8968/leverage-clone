# 管理员用户管理 API 文档

## 概述

本文档详细说明了Leverage平台的管理员用户管理系统API，包括用户注册、查询、更新和删除等功能。

**版本**: v1.1  
**最后更新**: 2025年11月12日  
**维护者**: AI Assistant

---

## 目录

1. [认证](#认证)
2. [用户注册](#用户注册)
3. [用户查询](#用户查询)
4. [用户更新](#用户更新)
5. [用户删除](#用户删除)
6. [错误处理](#错误处理)
7. [安全考虑](#安全考虑)

---

## 认证

### JWT Token

所有管理员操作都需要在请求头中包含有效的JWT token。

**Header格式**:
```
Authorization: Bearer {JWT_TOKEN}
```

**Token结构**:
```json
{
  "uid": "u_1234567890",
  "role": "admin",
  "email": "admin@example.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Token有效期**: 7天

**获取Token**: 通过登录或注册API返回

---

## 用户注册

### 1. 普通用户注册

**端点**: `POST /api/auth/register`

**权限**: 无需认证

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "secure_password_min_6_chars",
  "name": "User Name",
  "role": "user",
  "gender": "male"
}
```

**响应** (200 OK):
```json
{
  "token": "eyJhbGc...",
  "user": {
    "uid": "u_1234567890",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "avatar": "",
    "level": "New",
    "pointsBalance": 0,
    "status": "active",
    "createdAt": "2025-11-12T10:30:00Z"
  }
}
```

**错误响应**:
```json
{
  "error": "邮箱已注册"
}
```

**状态码**:
- `200`: 注册成功
- `400`: 缺少必要参数
- `409`: 邮箱已注册
- `500`: 服务器错误

---

### 2. 首个管理员自注册

**端点**: `POST /api/auth/register`

**权限**: 无需认证 (仅当系统中没有管理员时)

**请求体**:
```json
{
  "email": "admin@example.com",
  "password": "admin_secure_password",
  "name": "Platform Admin",
  "role": "admin",
  "gender": "male"
}
```

**响应** (200 OK):
```json
{
  "token": "eyJhbGc...",
  "user": {
    "uid": "u_1234567890",
    "email": "admin@example.com",
    "name": "Platform Admin",
    "role": "admin",
    "status": "active",
    "createdAt": "2025-11-12T10:30:00Z"
  }
}
```

**约束**:
- 只有系统中第一个用户可以注册为admin
- 后续admin注册需要现有admin授权
- 最多10个管理员

**错误响应**:
```json
{
  "error": "只有管理员可以创建管理员账户"
}
```

---

### 3. 管理员创建新管理员

**端点**: `POST /api/auth/register`

**权限**: 需要管理员token (Authorization header)

**请求头**:
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**请求体**:
```json
{
  "email": "new_admin@example.com",
  "password": "new_admin_password",
  "name": "Second Admin",
  "role": "admin",
  "gender": "female"
}
```

**响应** (200 OK):
```json
{
  "token": "eyJhbGc...",
  "user": {
    "uid": "u_9876543210",
    "email": "new_admin@example.com",
    "name": "Second Admin",
    "role": "admin",
    "status": "active",
    "createdAt": "2025-11-12T10:35:00Z"
  }
}
```

**约束**:
- 创建者必须是管理员 (由token验证)
- 不能超过10个管理员上限
- 验证失败返回403错误

**错误响应**:
```json
{
  "error": "平台管理员数量已达上限（最多10个）"
}
```

**状态码**:
- `200`: 创建成功
- `400`: 缺少参数或验证失败
- `403`: 权限不足或超过上限
- `409`: 邮箱已注册
- `500`: 服务器错误

---

## 用户查询

### 端点: `GET /api/users`

**权限**: 无需认证

### 1. 获取用户列表 (分页)

**请求**:
```
GET /api/users?page=1&limit=20
```

**查询参数**:
- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认50，最大100)

**响应** (200 OK):
```json
{
  "items": [
    {
      "uid": "u_1234567890",
      "email": "user@example.com",
      "name": "User Name",
      "role": "user",
      "status": "active",
      "rating": 4.5,
      "createdAt": "2025-11-12T10:30:00Z"
    }
  ],
  "total": 150
}
```

### 2. 精确查询

**按UID查询**:
```
GET /api/users?uid=u_1234567890
```

**按邮箱查询**:
```
GET /api/users?email=user@example.com
```

**按角色查询**:
```
GET /api/users?role=admin
```

**响应** (200 OK):
```json
{
  "items": [
    { /* user object */ }
  ],
  "total": 1
}
```

### 3. 模糊搜索

**按名称或邮箱搜索**:
```
GET /api/users?q=john&page=1&limit=20
```

**查询参数**:
- `q`: 搜索关键词
- `page`: 页码
- `limit`: 每页数量

**响应** (200 OK):
```json
{
  "items": [
    {
      "uid": "u_1234567890",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "creator",
      "status": "active"
    }
  ],
  "total": 5
}
```

**状态码**:
- `200`: 查询成功
- `500`: 服务器错误

---

## 用户更新

### 端点: `PUT /api/users?uid={targetUid}`

**权限**: 需要管理员token

**请求头**:
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**请求体** (可选字段):
```json
{
  "name": "Updated Name",
  "role": "creator",
  "status": "active",
  "rating": 5.0,
  "level": "Pro"
}
```

**响应** (200 OK):
```json
{
  "uid": "u_1234567890",
  "email": "user@example.com",
  "name": "Updated Name",
  "role": "creator",
  "status": "active",
  "rating": 5.0,
  "level": "Pro",
  "pointsBalance": 1000,
  "updatedAt": "2025-11-12T11:00:00Z"
}
```

**约束**:
- 不能修改 `uid` (自动从请求中删除)
- 不能修改 `email` (通过此API)
- 不能修改 `password` (需要专用API)
- 非管理员不能将用户升级为admin

**错误响应 - 未授权** (401):
```json
{
  "error": "Unauthorized"
}
```

**错误响应 - 禁止访问** (403):
```json
{
  "error": "Admin access required"
}
```

**错误响应 - 用户不存在** (404):
```json
{
  "error": "User not found"
}
```

**状态码**:
- `200`: 更新成功
- `400`: 缺少UID或参数错误
- `401`: 缺少或无效的token
- `403`: 非管理员
- `404`: 用户不存在
- `500`: 服务器错误
- `501`: 数据库不支持update操作

---

## 用户删除

### 端点: `DELETE /api/users?uid={targetUid}`

**权限**: 需要管理员token

**请求头**:
```
Authorization: Bearer {admin_token}
```

**请求示例**:
```bash
curl -X DELETE \
  "http://localhost:3000/api/users?uid=u_1234567890" \
  -H "Authorization: Bearer eyJhbGc..."
```

**响应** (200 OK):
```json
{
  "success": true
}
```

**约束**:
- 管理员不能删除自己的账户
- 删除后无法恢复 (物理删除)
- 删除用户的所有关联数据不被级联删除

**错误响应 - 不能自删** (400):
```json
{
  "error": "Cannot delete yourself"
}
```

**错误响应 - 未授权** (401):
```json
{
  "error": "Unauthorized"
}
```

**错误响应 - 禁止访问** (403):
```json
{
  "error": "Admin access required"
}
```

**错误响应 - 用户不存在** (404):
```json
{
  "error": "User not found"
}
```

**状态码**:
- `200`: 删除成功
- `400`: UID缺失或尝试自删
- `401`: 缺少或无效的token
- `403`: 非管理员
- `404`: 用户不存在
- `500`: 服务器错误
- `501`: 数据库不支持delete操作

---

## 错误处理

### 通用错误响应格式

```json
{
  "error": "错误描述信息"
}
```

### 常见错误代码

| 状态码 | 含义 | 原因 |
|--------|------|------|
| 400 | Bad Request | 缺少必要参数或参数验证失败 |
| 401 | Unauthorized | 缺少token或token无效 |
| 403 | Forbidden | 权限不足 (非管理员) |
| 404 | Not Found | 用户或资源不存在 |
| 409 | Conflict | 邮箱已存在或冲突 |
| 500 | Server Error | 服务器内部错误 |
| 501 | Not Implemented | 功能未实现或数据库不支持 |

### 错误处理最佳实践

```javascript
try {
  const response = await fetch('/api/users?uid=123', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    // 根据状态码处理不同错误
    switch (response.status) {
      case 401:
        // 重新登录
        break;
      case 403:
        // 显示权限不足提示
        break;
      case 404:
        // 用户不存在，刷新列表
        break;
      default:
        // 显示通用错误
    }
  }
} catch (error) {
  // 网络错误处理
}
```

---

## 安全考虑

### 1. Token安全

- Token存储在 `localStorage` 中
- 建议实现token刷新机制
- 考虑使用HttpOnly cookie存储

### 2. 请求验证

- 所有管理员操作都需要token认证
- Token过期返回401，客户端应重新登录
- 不要在URL中传递敏感信息

### 3. 数据保护

- UID不可修改
- 密码只能通过专用API修改
- 删除操作不可恢复

### 4. 访问控制

- 只有管理员可以执行PUT/DELETE操作
- 管理员数量限制为10个
- 管理员不能删除自己

### 5. 操作审计

- 所有管理员操作都被记录 (console.error)
- 建议实现持久化审计日志
- 定期检查异常操作

---

## 实现示例

### JavaScript/TypeScript

```typescript
// 初始化API客户端
class AdminAPI {
  private token: string = '';
  private baseUrl = 'http://localhost:3000/api';

  // 登录
  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    this.token = data.token;
    localStorage.setItem('auth_token', this.token);
    return data.user;
  }

  // 获取用户列表
  async getUsers(page = 1, limit = 20) {
    const response = await fetch(
      `${this.baseUrl}/users?page=${page}&limit=${limit}`
    );
    return response.json();
  }

  // 搜索用户
  async searchUsers(q: string) {
    const response = await fetch(
      `${this.baseUrl}/users?q=${encodeURIComponent(q)}`
    );
    return response.json();
  }

  // 更新用户
  async updateUser(uid: string, updates: any) {
    const response = await fetch(
      `${this.baseUrl}/users?uid=${uid}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  }

  // 删除用户
  async deleteUser(uid: string) {
    const response = await fetch(
      `${this.baseUrl}/users?uid=${uid}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  }

  // 创建管理员
  async createAdmin(email: string, password: string, name: string) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        name,
        role: 'admin'
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  }
}

// 使用示例
const api = new AdminAPI();

// 登录
await api.login('admin@example.com', 'password');

// 获取用户列表
const users = await api.getUsers(1, 50);

// 搜索用户
const results = await api.searchUsers('john');

// 更新用户
await api.updateUser('u_123', { role: 'creator', status: 'active' });

// 删除用户
await api.deleteUser('u_123');

// 创建新管理员
await api.createAdmin('admin2@example.com', 'password', 'Admin Two');
```

### cURL 示例

```bash
# 获取用户列表
curl "http://localhost:3000/api/users?page=1&limit=20"

# 搜索用户
curl "http://localhost:3000/api/users?q=john"

# 更新用户
curl -X PUT "http://localhost:3000/api/users?uid=u_123" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "creator",
    "status": "active"
  }'

# 删除用户
curl -X DELETE "http://localhost:3000/api/users?uid=u_123" \
  -H "Authorization: Bearer $TOKEN"

# 创建管理员
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@example.com",
    "password": "password123",
    "name": "New Admin",
    "role": "admin"
  }'
```

---

## 常见问题 (FAQ)

**Q: 如何修改用户密码?**  
A: 密码修改需要通过专用API (未在本文档中列出)，或用户登录后在设置中自行修改。

**Q: 删除的用户数据可以恢复吗?**  
A: 不能。删除是物理删除，建议在删除前备份重要数据。

**Q: Token过期后如何处理?**  
A: Token过期会返回401状态码，客户端应引导用户重新登录。

**Q: 能否创建超过10个管理员?**  
A: 不能。系统硬编码了10个管理员的上限。如需修改，请更新源代码。

**Q: 管理员可以修改其他管理员的权限吗?**  
A: 可以。通过PUT接口，管理员可以修改任何用户 (包括其他管理员) 的权限。

---

## 版本历史

- **v1.1** (2025-11-12): 初始版本，包含完整的CRUD操作
- **v1.0** (2025-11-10): 基础用户管理功能

---

**文档维护**: 如有问题或建议，请提交issue或PR。