# 平台管理员注册功能验证指南

## 功能变更说明

### 1. 前端注册页面
- **位置**: `/register` 页面
- **变更**: 角色选择下拉框中新增"平台管理员"选项
- **Schema**: 从 `z.enum(["user", "creator", "supplier"])` 修改为 `z.enum(["user", "creator", "supplier", "admin"])`

### 2. 后端注册API
- **位置**: `/api/auth/register`
- **变更**: 添加平台管理员数量限制逻辑
  - 注册前检查当前 admin 角色用户数量
  - 如果已有 10 个或更多管理员,返回 403 错误
  - 错误消息: "平台管理员数量已达上限（最多10个）"

### 3. 用户管理功能
- **位置**: `src/ai/flows/user-management-flows.ts` 的 `batchUpdateUsers` 函数
- **变更**: 添加注释说明允许管理员删除(禁用)其他管理员账号以释放名额
- **保护机制**: 管理员不能修改自己的角色/状态(防止自锁)

## 手动验证步骤

### 验证1: 前端注册页面显示管理员选项

1. 启动开发服务器: `npm run dev`
2. 访问: http://localhost:3000/register
3. 查看"您的角色"下拉框
4. ✅ **预期结果**: 应显示4个选项:
   - 用户
   - 创意者
   - 供应商
   - **平台管理员** (新增)

### 验证2: 成功注册平台管理员

1. 在注册页面填写表单:
   - 姓名: 测试管理员1
   - 邮箱: admin1@test.com
   - 密码: test123456
   - 角色: **平台管理员**
   - 性别: 任选
   - 勾选协议
2. 点击注册
3. ✅ **预期结果**: 
   - 注册成功
   - 自动跳转到 /demand-pool (管理员默认页面)
   - 左侧导航栏显示管理员菜单

### 验证3: 管理员数量限制

**前置条件**: 数据库中已有 10 个 admin 角色用户

1. 尝试注册第 11 个平台管理员账号
2. 填写表单并提交
3. ✅ **预期结果**:
   - 注册失败
   - 显示错误提示: "平台管理员数量已达上限(最多10个)"
   - HTTP 状态码: 403 Forbidden

### 验证4: 管理员删除功能

1. 以管理员身份登录
2. 访问: /permissions (用户与权限管理)
3. 筛选 role=admin 的用户
4. 选择其他管理员账号(不能选自己)
5. 点击"批量操作" → "启用/禁用"
6. 选择"禁用"
7. ✅ **预期结果**:
   - 被禁用的管理员账号状态变为 "suspended"
   - 该账号无法登录
   - 平台管理员数量减少1个,释放名额

### 验证5: 自我保护机制

1. 以管理员身份登录
2. 访问 /permissions
3. 选择**自己的账号**
4. 尝试批量修改角色/状态
5. ✅ **预期结果**:
   - 操作失败
   - 显示错误: "为了安全,管理员不能通过批量操作来修改自己的角色、状态或星级。"

## 技术验证(开发者)

### TypeScript 类型检查
```bash
npm run typecheck
```
✅ 预期: 无类型错误

### ESLint 检查
```bash
npm run lint
```
✅ 预期: 0 errors (warnings 可忽略)

### 生产构建
```bash
npm run build
```
✅ 预期: 编译成功,无错误

### API 测试(使用 curl 或 Postman)

#### 获取当前管理员数量
```bash
curl http://localhost:3000/api/users?role=admin
```

#### 注册新管理员
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@test.com",
    "password": "test123456",
    "name": "新管理员",
    "role": "admin"
  }'
```

成功响应示例:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "uid": "u_1234567890",
    "email": "newadmin@test.com",
    "name": "新管理员",
    "role": "admin",
    "status": "active"
  }
}
```

失败响应示例(达到上限):
```json
{
  "error": "平台管理员数量已达上限（最多10个）"
}
```
HTTP状态码: 403

## 修改的文件清单

1. **src/app/register/page.tsx**
   - 修改: formSchema 的 role enum 添加 "admin"
   - 修改: SelectContent 添加 `<SelectItem value="admin">平台管理员</SelectItem>`

2. **src/app/api/auth/register/route.ts**
   - 新增: admin 角色数量检查逻辑(15-23行)
   - 新增: 达到上限时返回 403 错误

3. **src/ai/flows/user-management-flows.ts**
   - 修改: batchUpdateUsers 函数中 disabled 处理的注释
   - 说明: 允许管理员删除其他管理员以释放名额

## 验证清单

- [ ] TypeScript typecheck 通过
- [ ] ESLint 检查通过(0 errors)
- [ ] Production build 成功
- [ ] 注册页面显示"平台管理员"选项
- [ ] 成功注册新管理员账号
- [ ] 达到10个上限时正确拒绝注册
- [ ] 管理员可以禁用其他管理员
- [ ] 管理员不能修改自己的状态
- [ ] 禁用管理员后可以注册新管理员(名额释放)

## 注意事项

1. **生产环境部署前**: 确认数据库中是否已有管理员账号,避免无法登录
2. **安全建议**: 首次部署时至少保留2个管理员账号,避免单点故障
3. **数据迁移**: 如果之前有通过后台创建的管理员,无需迁移,新逻辑向后兼容
4. **删除 vs 禁用**: 当前实现是"禁用"(status=suspended),不是物理删除,可恢复

## 回滚方案

如果需要回滚此功能:

1. 恢复 `src/app/register/page.tsx`:
   - role enum 改回 `["user", "creator", "supplier"]`
   - 移除 admin 选项

2. 恢复 `src/app/api/auth/register/route.ts`:
   - 移除 lines 15-23 的 admin 数量检查逻辑

3. 重新构建: `npm run build`
