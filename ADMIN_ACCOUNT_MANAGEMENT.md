# 管理员账户管理指南

本文档说明如何创建和管理平台管理员账户。

## 📋 目录

- [首次注册管理员](#首次注册管理员)
- [使用脚本创建管理员](#使用脚本创建管理员)
- [升级现有用户为管理员](#升级现有用户为管理员)
- [管理员权限说明](#管理员权限说明)

---

## 🎯 首次注册管理员

### 自动检测机制

当系统中**没有任何管理员账户**时，注册页面会自动显示"平台管理员"选项，允许首位注册用户创建管理员账户。

### 操作步骤

1. 访问注册页面: `/register`
2. 填写基本信息（姓名、邮箱、密码）
3. 在"您的角色"下拉框中选择 **平台管理员**
4. 完成注册

### 安全机制

- ✅ 只有当数据库中**没有管理员**时才显示管理员选项
- ✅ 一旦有管理员存在，普通用户无法自行创建管理员账户
- ✅ 后续管理员账户必须由现有管理员创建

---

## 🛠️ 使用脚本创建管理员

### 方法 1: 命令行参数

```bash
npx tsx scripts/create-admin.ts \
  --email admin@example.com \
  --password YourSecurePassword \
  --name "平台管理员"
```

### 方法 2: 环境变量

```bash
# Windows PowerShell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="YourSecurePassword"
$env:ADMIN_NAME="平台管理员"
npx tsx scripts/create-admin.ts

# Linux/Mac
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=YourSecurePassword \
ADMIN_NAME="平台管理员" \
npx tsx scripts/create-admin.ts
```

### 方法 3: 使用 .env 文件

创建 `.env.local` 文件：

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourSecurePassword
ADMIN_NAME=平台管理员
```

然后运行：

```bash
npx tsx --env-file=.env.local scripts/create-admin.ts
```

### 输出示例

```
🚀 开始创建管理员账户...

📡 连接到腾讯云数据库...
🔍 检查管理员是否已存在...
🔐 加密密码...
✍️  创建管理员账户...

✅ 管理员账户创建成功！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 邮箱: admin@example.com
👤 姓名: 平台管理员
🆔 用户ID: 67891234567890abcdef1234
🔑 角色: 平台管理员
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 提示: 请使用此邮箱和密码登录系统
```

---

## 📈 升级现有用户为管理员

如果需要将已注册的普通用户升级为管理员：

### 使用脚本

```bash
# 方法 1: 命令行参数
npx tsx scripts/upgrade-to-admin.ts --email user@example.com

# 方法 2: 环境变量
USER_EMAIL=user@example.com npx tsx scripts/upgrade-to-admin.ts
```

### 输出示例

```
🚀 开始升级用户为管理员...

📡 连接到腾讯云数据库...
🔍 查找用户...
✍️  将用户 张三 (user@example.com) 升级为管理员...

✅ 用户已成功升级为管理员！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 邮箱: user@example.com
👤 姓名: 张三
🆔 用户ID: 67891234567890abcdef1234
🔑 旧角色: user
🔑 新角色: admin (平台管理员)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔐 管理员权限说明

### 平台管理员可以：

- ✅ **创建其他管理员账户**：通过注册页面创建新的管理员
- ✅ **管理所有用户**：查看、编辑、删除用户信息
- ✅ **管理平台内容**：需求、产品、创意等
- ✅ **访问管理后台**：`/admin` 路径下的所有功能
- ✅ **系统配置管理**：平台设置、功能开关等

### 权限控制机制

1. **前端权限**：
   - 管理员登录后，注册页面会显示"平台管理员"角色选项
   - 非管理员用户无法看到该选项

2. **后端验证**：
   - 创建管理员账户时，API 会验证请求者的 JWT token
   - 只有已认证的管理员才能创建新管理员账户

3. **数据库层**：
   - 用户角色存储在 `users` 集合的 `role` 字段
   - 可选值：`user`（普通用户）、`creator`（创意者）、`supplier`（供应商）、`admin`（管理员）

---

## 🔍 常见问题

### Q1: 如何检查系统中是否有管理员？

通过 API 端点检查：

```bash
curl http://localhost:3000/api/admin/check-exists
# 返回: {"adminExists": true/false}
```

或直接在 TCB 数据库控制台查询：

```javascript
db.collection('users').where({ role: 'admin' }).get()
```

### Q2: 忘记管理员密码怎么办？

使用脚本重置密码（即将添加）或在 TCB 控制台直接更新密码哈希值。

### Q3: 可以有多个管理员吗？

可以，系统支持多个管理员账户。建议为每位管理人员创建独立账户以便审计。

### Q4: 如何撤销管理员权限？

目前需要在 TCB 数据库控制台手动将用户的 `role` 字段从 `admin` 改为其他角色（如 `user`）。

---

## 📝 最佳实践

1. **首次部署**：立即创建管理员账户，避免安全风险
2. **密码强度**：管理员密码至少 12 位，包含大小写字母、数字和特殊字符
3. **定期审计**：定期检查管理员账户列表，移除不必要的账户
4. **操作日志**：记录管理员的重要操作（功能开发中）
5. **备用管理员**：至少保留 2 个管理员账户，避免单点故障

---

## 🚨 安全注意事项

- ⚠️ **不要在生产环境**的代码或配置文件中硬编码管理员密码
- ⚠️ **使用环境变量**存储敏感信息，并确保 `.env` 文件不被提交到版本控制
- ⚠️ **定期更换密码**，尤其是怀疑账户可能被泄露时
- ⚠️ **启用多因素认证**（MFA）功能开发中
- ⚠️ **限制管理员登录 IP**（高级功能，可选）

---

## 📚 相关文档

- [用户认证系统](../docs/AUTH_SYSTEM.md)
- [API 权限控制](../docs/API_PERMISSIONS.md)
- [数据库架构](../docs/DATABASE_SCHEMA.md)

---

**最后更新**: 2025年11月12日
