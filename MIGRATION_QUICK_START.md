# 🚀 Firebase → Tencent CloudBase 迁移快速开始指南

## ⚡ 5 分钟快速开始

### 1️⃣ 导出 Firestore 数据

```bash
# 设置 Firestore 服务账号路径（或通过环境变量）
export FIREBASE_SERVICE_ACCOUNT_PATH="./service-account-key.json"

# 导出所有数据
npm run migrate:export --output="backup.json"
```

**预期输出：**
```
✅ Export complete: 2500 documents in 5.23 MB
✅ Data exported to: backup.json
```

---

### 2️⃣ 配置 TCB 凭证

在 `.env.local` 中添加：

```bash
# Tencent CloudBase 配置
TCB_ENV_ID=your-tcb-env-id
TENCENTCLOUD_SECRET_ID=your-secret-id
TENCENTCLOUD_SECRET_KEY=your-secret-key
TENCENTCLOUD_REGION=ap-guangzhou
```

---

### 3️⃣ 干运行导入（推荐）

```bash
# 模拟导入，不实际修改数据
npm run migrate:dry-run --input="backup.json"
```

**预期输出：**
```
✅ Import complete: 2500/2500 documents in 0m 3s
[DRY-RUN] No data was actually imported
```

---

### 4️⃣ 正式导入

```bash
# 执行正式导入
npm run migrate:import --input="backup.json"
```

**预期输出：**
```
✅ Import complete: 2500/2500 documents in 0m 25s
```

---

### 5️⃣ 验证数据一致性

```bash
# 验证导入的数据
npm run migrate:verify --input="backup.json"
```

**预期输出：**
```
✅ Verification complete in 0m 15s
All data verified successfully. Safe to decommission Firestore.
```

---

## 📚 完整命令参考

### 导出

```bash
# 导出所有集合
npm run migrate:export --output="full-backup.json"

# 导出特定集合（用逗号分隔）
npm run migrate:export --output="users-backup.json" --collections=users,profiles

# 静默模式（少日志输出）
npm run migrate:export --output="backup.json" --quiet
```

### 导入

```bash
# 标准导入
npm run migrate:import --input="backup.json"

# 干运行（推荐在正式导入前进行）
npm run migrate:dry-run --input="backup.json"

# 导入特定集合
npm run migrate:import --input="backup.json" --collections=users,products
```

### 验证

```bash
# 验证所有数据
npm run migrate:verify --input="backup.json"

# 详细输出
npm run migrate:verify --input="backup.json" --verbose
```

---

## ⚠️ 常见错误及解决

### 错误 1: FIREBASE_SERVICE_ACCOUNT_PATH 未找到

```
Error: FIREBASE_SERVICE_ACCOUNT_PATH not found
```

**解决：**
```bash
export FIREBASE_SERVICE_ACCOUNT_PATH="./service-account-key.json"
# 或将其添加到 .env.local
```

### 错误 2: TCB 凭证缺失

```
Error: TCB credentials missing
```

**解决：**
```bash
# 在 .env.local 中配置
TCB_ENV_ID=your-env-id
TENCENTCLOUD_SECRET_ID=your-id
TENCENTCLOUD_SECRET_KEY=your-key
```

### 错误 3: 内存不足

```
JavaScript heap out of memory
```

**解决：**
```bash
# 增加 Node.js 堆内存
node --max-old-space-size=4096 ./node_modules/.bin/ts-node scripts/firestore-to-tcb-migration.ts
```

---

## 🔍 验证迁移成功

迁移完成后，验证以下内容：

- [x] 所有导出数据已导入到 TCB
- [x] 验证命令报告 0 个失败
- [x] 应用代码已切换到使用 cloudbase-compat
- [x] 环境变量已正确配置
- [x] 后端成功连接到 TCB

---

## 📖 详细文档

- **完整迁移指南** → [`FIRESTORE_TO_TCB_MIGRATION_GUIDE.md`](FIRESTORE_TO_TCB_MIGRATION_GUIDE.md)
- **迁移总结** → [`MIGRATION_COMPLETE_SUMMARY.md`](MIGRATION_COMPLETE_SUMMARY.md)
- **后端架构** → [`BACKEND_MIGRATION_NOTES.md`](BACKEND_MIGRATION_NOTES.md)

---

## 🆘 需要帮助？

若遇到问题，请：

1. **查看详细日志** — 添加 `--verbose` 选项
2. **查阅文档** — 参考上述完整指南中的 [故障排查](#故障排查) 部分
3. **干运行测试** — 使用 `--dry-run` 选项模拟操作
4. **检查凭证** — 确保 Firestore 和 TCB 凭证正确配置

---

## ✨ 迁移完成后

- ✅ 应用自动使用 TCB 存储数据
- ✅ Firebase 可以保留为备用降级方案
- ✅ 所有现有代码无需修改
- ✅ 性能和成本得到优化

---

**祝迁移顺利！🎉**
