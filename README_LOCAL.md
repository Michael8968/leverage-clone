# 本地开发与 CloudBase 种子数据说明

本文档说明如何在本地使用项目内的脚本将示例数据导入 CloudBase，以及如何安全管理凭据、排查常见错误。

## 重要路径
- 种子脚本：`scripts/seed-cloudbase.js`
- 本地模拟脚本：`setup-local.js`（用于 dry-run / 基本验证）
- 示例数据目录：`data/`（包含 `users.json`, `demands.json`, `suppliers.json`, `products.json`, `prompts.json`）

---

## 1. 环境变量（示例 `.env`）
请在项目根创建 `.env`（切勿提交到版本控制）并填充：

```
CLOUDBASE_ENV_ID=leverage-test-abc123-9bn41a84185
CLOUDBASE_HTTP_API_KEY=<your_http_api_key>
CLOUDBASE_SECRET_ID=<your_secret_id>
CLOUDBASE_SECRET_KEY=<your_secret_key>
```

说明：
- `CLOUDBASE_ENV_ID`：CloudBase 环境 ID（必需）。
- `CLOUDBASE_HTTP_API_KEY`：客户端/HTTP 用的可发布密钥（可选，用于某些 REST 场景）。
- `CLOUDBASE_SECRET_ID` / `CLOUDBASE_SECRET_KEY`：用于 SDK 的管理员凭据（必需执行写入操作）。请对其进行严格保管，建议仅在本地临时设置或使用 CI 密钥管理。

---

## 2. 本地快速命令（PowerShell）
打开项目根目录并运行：

- 安装依赖（如尚未安装）
```powershell
npm install
```

- 本地 dry-run（只打印将要写入的集合和数量）
```powershell
node scripts/seed-cloudbase.js --dry-run
# 或使用 package.json 脚本
npm run seed-cloud
```

- 在当前 PowerShell 会话临时设置凭据并执行写入（推荐测试时使用，凭据不会写入磁盘）：
```powershell
$env:CLOUDBASE_ENV_ID='leverage-test-abc123-9bn41a84185'
$env:CLOUDBASE_SECRET_ID='<your_secret_id>'
$env:CLOUDBASE_SECRET_KEY='<your_secret_key>'
node scripts/seed-cloudbase.js --push
```

- 完成后清理凭据（移除当前会话的环境变量）
```powershell
Remove-Item Env:CLOUDBASE_SECRET_ID
Remove-Item Env:CLOUDBASE_SECRET_KEY
Remove-Item Env:CLOUDBASE_HTTP_API_KEY
```

---

## 3. 常见错误与排查

- SIGN_PARAM_INVALID / secret id error
  - 原因：提供的 SecretId/SecretKey 与环境不匹配或被禁用，或签名参数不正确。
  - 解决：确认密钥来自与 `CLOUDBASE_ENV_ID` 同一腾讯云账号，且未过期；必要时在腾讯云控制台重新生成密钥并赋予相应 CAM 权限（写入数据库）。

- DATABASE_COLLECTION_NOT_EXIST / [ResourceNotFound]
  - 原因：目标 CloudBase 环境还未初始化数据库或集合尚未创建。
  - 解决：在 CloudBase 控制台手动创建对应集合（users, demands, suppliers, products, prompts），或让脚本以管理员权限创建集合（脚本已支持通过 SDK 调用 `db.createCollection(name)`）。

- 写入后查询仍为 0
  - 排查：检查 SDK 返回的 `requestId` 与返回体是否包含错误（如上两类）；确认 SDK 使用的凭据与目标环境一致。

---

## 4. 进阶 & 自动化建议
- 将凭据存放到 CI/CD 的 secrets（例如 GitHub Actions secrets 或腾讯云的密钥管理）并在部署时注入，避免在开发机上长期保存。
- 为 `scripts/seed-cloudbase.js` 增加：`--skip-existing`, `--batch-size`, `--concurrency`, `--force` 等参数支持更灵活的导入。
- 提供 `scripts/rollback-cloudbase.js` 以支持一键回滚（删除由导入创建的文档）。

---

如需我把 README 合并到项目主 README 或添加回滚脚本、增强导入选项，我可以继续实现。