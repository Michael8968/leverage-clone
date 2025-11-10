# 数据库迁移验证系统

按照标准步骤执行完整的TCB数据库迁移和验证流程。

## 流程步骤

| 步骤 | VS操作 | 检查点 |
|------|--------|--------|
| 运行检查 | `node db-check.js` | 表格全'OK'，数据>0 |
| 修复不齐 | Copilot gen fix代码，`node migrate.js` | TCB控制台>数据库>刷新集合 |
| 数据导入 | 若有Firebase备份，用`tcb database:import backup.json` | "验证字段类型 (e.g., timestamp非string)" |
| 全测试 | Postman调用API如getDesigners (query users role='creator') | 返回预期数据，无ResourceNotFound |
| 监控 | TCB日志过滤'database' | 无创建/权限错 |

## 脚本说明

### 1. 运行检查 - `db-check.js`
- **功能**: 检查所有集合状态，确保数据完整性
- **检查点**: 表格显示所有集合状态为'OK'，数据量>0
- **关键集合**: users(47条), demands(12条) - AI flows测试必需

### 2. 修复不齐 - `migrate.js`
- **功能**: 自动修复数据库对齐问题，补充缺失数据
- **操作**: 生成修复代码，运行迁移脚本
- **验证**: TCB控制台>数据库>刷新集合，确认数据完整

### 3. 数据导入 - `import-firebase.js`
- **功能**: 从Firebase备份导入数据到TCB
- **条件**: 存在 `firebase-backup.json` 文件
- **验证**: 检查字段类型转换 (timestamp等)

### 4. 全测试 - `api-test.js`
- **功能**: 模拟Postman API调用测试
- **测试案例**:
  - `getDesigners`: 查询users role='creator'
  - `getUsers`: 查询所有users
  - `getDemands`: 查询所有demands
- **检查点**: 返回预期数据，无ResourceNotFound错误

### 5. 监控 - `monitor.js`
- **功能**: TCB日志监控和连接检查
- **检查内容**: 数据库相关日志过滤
- **关注错误**: 创建失败、权限错误等

## 一键执行

### 完整流程
```bash
node scripts/run-workflow.js
```

### 单个步骤
```bash
# 查看所有步骤
node scripts/run-workflow.js --list

# 执行单个步骤
node scripts/run-workflow.js --step db-check
node scripts/run-workflow.js --step migrate
node scripts/run-workflow.js --step api-test
```

## 单独执行

```bash
# 数据库状态检查
node scripts/db-check.js

# 数据迁移修复
node scripts/migrate.js

# Firebase数据导入
node scripts/import-firebase.js

# API功能测试
node scripts/api-test.js

# 日志监控检查
node scripts/monitor.js
```

## 环境配置

确保 `.env` 文件包含：
```env
TCB_ENV_ID=your-tcb-env-id
TCB_SECRET_ID=your-secret-id
TCB_SECRET_KEY=your-secret-key
TENCENTCLOUD_REGION=ap-shanghai
```

## Firebase备份格式

`firebase-backup.json` 格式：
```json
{
  "users": [...],
  "products": [...],
  "demands": [...],
  "suppliers": [...],
  "prompts": [...]
}
```

## 检查结果

### 成功标准
- ✅ 所有关键集合 (users/demands) 有数据
- ✅ API测试全部通过，无ResourceNotFound
- ✅ 数据库连接正常
- ✅ 无权限和创建错误

### 输出示例
```
🎉 数据库迁移验证流程完全成功！
✅ 所有检查通过，数据库已准备好用于生产环境。
🚀 可以进行最终部署和上线。
```

## 故障排除

### 集合不存在
1. 检查集合名称拼写
2. 在TCB控制台手动创建集合
3. 重新运行迁移脚本

### API测试失败
1. 确认数据库连接正常
2. 检查集合数据是否存在
3. 验证查询条件正确

### 权限错误
1. 检查环境变量配置
2. 验证TCB密钥权限
3. 确认环境ID正确

## 集成部署

建议在部署流程中集成：
```bash
# 数据库验证
node scripts/run-workflow.js

# 部署应用
npm run deploy:tcb
```

## 关键集合

- **users**: 用户数据 (必需, 47条) - AI flows测试关键
- **demands**: 需求数据 (必需, 12条) - AI flows测试关键
- **products**: 产品数据 (必需, 19条)
- **suppliers**: 供应商数据 (必需, 13条)
- **prompts**: 提示模板 (必需, 3条)

## 监控要点

- 数据库操作日志
- API调用成功率
- 集合访问权限
- 数据完整性检查