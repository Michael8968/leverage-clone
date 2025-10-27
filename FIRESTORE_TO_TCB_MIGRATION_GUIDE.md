# Firestore 到 Tencent CloudBase (TCB) 数据迁移指南

## 📋 目录

1. [迁移概览](#迁移概览)
2. [前置条件](#前置条件)
3. [迁移步骤](#迁移步骤)
4. [回滚计划](#回滚计划)
5. [故障排查](#故障排查)
6. [常见问题](#常见问题)

---

## 迁移概览

本指南说明如何将数据从 Google Cloud Firestore 迁移到 Tencent CloudBase (TCB)。迁移工具支持以下功能：

- **导出** — 从 Firestore 导出全量数据为 JSON 文件
- **导入** — 将 JSON 数据导入到 TCB 数据库
- **验证** — 比对 Firestore 和 TCB 数据，确保完整性
- **干运行** — 模拟导入流程，不实际修改数据

### 迁移时间表

| 阶段 | 时间 | 操作 |
|------|------|------|
| **准备** | T-7 天 | 备份 Firestore、配置 TCB 环境 |
| **导出** | T-1 天 | 执行完整导出，验证数据 |
| **导入** | T 天 | 导入数据到 TCB，验证一致性 |
| **验收** | T+1 天 | 切换流量，监控数据一致性 |
| **清理** | T+7 天 | 关闭 Firestore，归档备份 |

---

## 前置条件

### 1. 环境配置

#### Firestore 凭证
```bash
# 下载 Firebase 服务账号密钥
# https://console.firebase.google.com/project/YOUR-PROJECT/settings/serviceaccounts/adminsdk

export FIREBASE_SERVICE_ACCOUNT_PATH="./service-account-key.json"
```

#### TCB 凭证
```bash
# 在 .env.local 中配置 TCB 凭证
TCB_ENV_ID=your-tcb-env-id
TENCENTCLOUD_SECRET_ID=your-secret-id
TENCENTCLOUD_SECRET_KEY=your-secret-key
TENCENTCLOUD_REGION=ap-guangzhou
```

### 2. 依赖安装

迁移脚本依赖以下 npm 包（已在项目中安装）：
- `firebase-admin` — 从 Firestore 读取数据
- `@cloudbase/node-sdk` — 写入 TCB 数据
- `ts-node` — 执行 TypeScript 脚本

### 3. 数据备份

**强烈建议** 在迁移前执行 Firestore 备份：

```bash
# 使用 Firebase CLI
firebase firestore:delete --all

# 或通过 GCP Console 导出
gsutil -m cp -r gs://YOUR-BUCKET/firestore-exports/ ./backups/
```

---

## 迁移步骤

### 步骤 1: 导出 Firestore 数据

将 Firestore 中的所有数据导出为 JSON 文件：

```bash
# 导出所有集合
npx ts-node scripts/firestore-to-tcb-migration.ts \
  --action export \
  --output firestore-export.json

# 导出特定集合（用逗号分隔）
npx ts-node scripts/firestore-to-tcb-migration.ts \
  --action export \
  --output users-export.json \
  --collections users,profiles
```

**预期输出：**
```
📊 Firestore to TCB Migration Tool
Action: export

🚀 Starting Firestore export...
📦 Found 8 collections, migrating 8...
  → Exporting collection: users
    ✓ Exported 150 documents from users
  → Exporting collection: products
    ✓ Exported 500 documents from products
...
✅ Export complete: 2500 documents in 5.23 MB

✅ Data exported to: firestore-export.json
```

**输出文件结构：**
```json
{
  "timestamp": "2025-10-22T10:30:00Z",
  "version": "1.0",
  "collections": {
    "users": [
      { "_id": "user123", "name": "John Doe", "email": "john@example.com", ... },
      ...
    ],
    "products": [
      { "_id": "prod456", "title": "Product", "price": 99.99, ... },
      ...
    ]
  },
  "metadata": {
    "totalDocuments": 2500,
    "collectionsCount": 8,
    "dataSize": 5482496,
    "estimatedMigrationTime": "0m 25s"
  }
}
```

### 步骤 2: 验证导出数据

检查导出文件的完整性和正确性：

```bash
# 统计导出的文档数
cat firestore-export.json | jq '.metadata'

# 查看集合列表
cat firestore-export.json | jq '.collections | keys'

# 检查特定集合（如 users）
cat firestore-export.json | jq '.collections.users | length'
```

### 步骤 3: 干运行导入测试

在实际导入前，先进行干运行以验证导入流程：

```bash
npx ts-node scripts/firestore-to-tcb-migration.ts \
  --action import \
  --input firestore-export.json \
  --dry-run
```

**预期输出：**
```
📊 Firestore to TCB Migration Tool
Action: import

🚀 Starting TCB import...
  → Importing collection: users
    [DRY-RUN] Would import document user123 to users
    ✓ Imported user123
    ...
    Summary: 150/150 successful
  → Importing collection: products
    ...

✅ Import complete: 2500/2500 documents imported in 0m 3s

📋 Import Report:
{
  "action": "import",
  "status": "success",
  "timestamp": "2025-10-22T10:35:00Z",
  "summary": {
    "totalDocuments": 2500,
    "successfulDocuments": 2500,
    "failedDocuments": 0,
    "skippedDocuments": 0
  },
  "details": { ... },
  "duration": "0m 3s",
  "warnings": ["Dry-run mode: No data was actually imported"]
}
```

### 步骤 4: 执行正式导入

确认干运行成功后，执行正式导入：

```bash
npx ts-node scripts/firestore-to-tcb-migration.ts \
  --action import \
  --input firestore-export.json
```

**预期输出（与干运行类似，但不含 DRY-RUN 标记）：**
```
✅ Import complete: 2500/2500 documents imported in 0m 25s

📋 Import Report:
{
  "action": "import",
  "status": "success",
  "summary": {
    "totalDocuments": 2500,
    "successfulDocuments": 2500,
    "failedDocuments": 0
  },
  "duration": "0m 25s"
}
```

### 步骤 5: 验证数据一致性

导入完成后，验证 TCB 中的数据与原始导出数据一致：

```bash
npx ts-node scripts/firestore-to-tcb-migration.ts \
  --action verify \
  --input firestore-export.json
```

**预期输出：**
```
✅ Verification complete in 0m 15s

📋 Verification Report:
{
  "action": "verify",
  "status": "success",
  "summary": {
    "totalDocuments": 2500,
    "successfulDocuments": 2500,
    "failedDocuments": 0
  },
  "recommendations": [
    "All data verified successfully. Safe to decommission Firestore."
  ]
}
```

---

## 回滚计划

如果迁移过程中发生问题，按以下步骤回滚：

### 快速回滚（< 1 小时内）

1. **停止所有写操作**
   ```bash
   # 禁用 API 或切换流量回 Firestore
   # 详见应用配置文档
   ```

2. **删除 TCB 中导入的数据**
   ```bash
   npx ts-node scripts/firestore-to-tcb-migration.ts \
     --action cleanup \
     --collections users,products,orders
   ```

3. **恢复 Firestore**
   - 从备份恢复（若数据被误删）
   - 切换应用流量回 Firestore

### 完整回滚（> 1 小时）

1. 启用 Firestore 备份还原
2. 等待数据还原完成（可能需要数小时）
3. 验证数据完整性
4. 手动处理回滚期间的新数据

---

## 故障排查

### 问题 1: 连接 Firestore 失败

```
Error: FIREBASE_SERVICE_ACCOUNT_PATH not found
```

**解决方案：**
```bash
# 确认路径正确
echo $FIREBASE_SERVICE_ACCOUNT_PATH

# 下载新的服务账号密钥
# https://console.firebase.google.com/project/YOUR-PROJECT/settings/serviceaccounts/adminsdk

export FIREBASE_SERVICE_ACCOUNT_PATH="./service-account-key.json"
```

### 问题 2: 连接 TCB 失败

```
Error: TCB credentials missing. Please set TCB_ENV_ID/CLOUDBASE_ENV_ID, 
TENCENTCLOUD_SECRET_ID, TENCENTCLOUD_SECRET_KEY
```

**解决方案：**
```bash
# 检查环境变量
env | grep TCB
env | grep TENCENTCLOUD

# 设置环境变量
source .env.local

# 或直接导出
export TCB_ENV_ID="your-env-id"
export TENCENTCLOUD_SECRET_ID="your-secret-id"
export TENCENTCLOUD_SECRET_KEY="your-secret-key"
```

### 问题 3: 导入部分失败

```
"status": "partial",
"failedDocuments": 50,
"warnings": ["50 documents failed verification"]
```

**解决方案：**
1. 查看详细错误信息
   ```bash
   cat migration-report.json | jq '.details.collections.errors'
   ```

2. 修复失败的文档（手动或脚本）

3. 重新导入只失败的文档
   ```bash
   npx ts-node scripts/firestore-to-tcb-migration.ts \
     --action import \
     --input firestore-export.json \
     --collections failed_collection
   ```

### 问题 4: 内存不足

若导出或导入过程中内存溢出：

```bash
# 增加 Node.js 堆内存
node --max-old-space-size=4096 \
  ./node_modules/.bin/ts-node \
  scripts/firestore-to-tcb-migration.ts \
  --action export \
  --output large-export.json
```

---

## 常见问题

### Q1: 迁移期间是否需要停机？

**A:** 不需要完全停机。推荐的做法是：
- 导出 → 导入（需要 1-2 小时）
- 在此期间，应用可继续使用 Firestore
- 导入完成并验证后，再切换流量到 TCB
- 切换流量后的短时间停机是可接受的

### Q2: 迁移后的数据是否完全一致？

**A:** 迁移脚本支持逐文档验证，确保数据完整。但建议：
- 导入后运行 `verify` 命令确认
- 对关键业务数据进行抽样检查
- 在生产流量切换前进行充分的功能测试

### Q3: 如何处理 Firestore 的特殊数据类型（如 Timestamp、GeoPoint）？

**A:** 迁移脚本会自动转换：
- **Firestore Timestamp** → ISO 8601 字符串
- **GeoPoint** → `{lat, lng}` 对象
- **Blob** → Base64 字符串
- **Reference** → 字符串 ID

导入时，TCB 会按原类型存储。建议应用层处理类型转换。

### Q4: 可以分阶段迁移吗？

**A:** 可以。迁移脚本支持指定集合：
```bash
# 第一阶段：迁移用户数据
npx ts-node scripts/firestore-to-tcb-migration.ts \
  --action export \
  --output phase1-users.json \
  --collections users,profiles

# 第二阶段：迁移产品数据
npx ts-node scripts/firestore-to-tcb-migration.ts \
  --action export \
  --output phase2-products.json \
  --collections products,categories
```

### Q5: 迁移后是否可以继续使用 Firestore？

**A:** 不建议。原因：
- 代码已完全切换到 TCB
- 维护两套数据库会导致数据不一致
- Firestore 将成为成本支出

建议在迁移验证后（2-4 周），正式停用 Firestore。

### Q6: 迁移脚本是否支持自动调度？

**A:** 目前不支持。但可通过以下方式实现自动化：
```bash
# 使用 cron（Linux/macOS）
0 2 * * * /path/to/migration-script.sh

# 或使用 CI/CD（如 GitHub Actions）
on:
  schedule:
    - cron: '0 2 * * 0'  # 每周日 2:00 AM UTC
```

---

## 📞 支持与反馈

若在迁移过程中遇到问题，请：

1. 查看本文档的 [故障排查](#故障排查) 部分
2. 检查迁移脚本的详细日志（使用 `--verbose` 选项）
3. 联系技术支持团队

---

**最后更新：** 2025-10-22  
**迁移工具版本：** 1.0  
**状态：** ✅ 生产就绪
