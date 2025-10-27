# 本地登录测试归档（Local login/register test archive）

日期：2025-10-28

说明：
此文档归档了在本地启动/测试登录与注册流程的所有步骤、常用命令、生成的测试账号位置与故障排查方法。适合以后快速恢复和给其他开发者参考。

---

## 关键文件（仓库内）
- `data/generated-test-accounts.json` — 明文生成的测试账号与密码清单（运行过 `scripts/create-test-users.ts` 后生成）。
- `data/local-seeded-users.json` — 本地回退数据库使用的用户集合（含 `password_hash`）。
- `public/set-token.html` — 静态页面：通过 URL query 写入 `localStorage.auth_token` 并跳转（用于跳过登录直接进入 dashboard）。
- `scripts/login-internal.ts` — 在 Node 进程内直接调用 API route（不走 HTTP）以获取 JWT token（用于在本地生成 token 并验证 `/api/auth/me`）。
- `scripts/create-test-users.ts` — 批量创建测试账号脚本（会尝试注册到 CloudBase；若没有 CloudBase 凭据则回退到本地生成并写入 `data/generated-test-accounts.json`）。
- `scripts/sync-local-seed.ts` — 把明文账号同步为 bcrypt-hash 写入 `data/local-seeded-users.json`，供本地 JSON 回退数据库验证密码。
- `src/lib/tcb.ts` — 已修改：当 CloudBase 环境变量缺失时，提供 JSON 文件的本地回退实现以支持登录/注册逻辑。

---

## 快速复现（最小步骤）
1. 启动项目（在项目根目录）并保持 dev server 运行：

```powershell
# 在一个持久终端窗口运行（便于查看日志）
npm run dev
```

2. 查看 dev server 是否就绪（Console 中应显示）：

```
Local:  http://localhost:3000
Network: http://<你的局域网IP>:3000
```

3. 生成（或阅读已有的）测试账号：

```powershell
# 如果还没生成，可运行
npx tsx scripts/create-test-users.ts
# 生成的明文凭据保存在
# data/generated-test-accounts.json
```

4. 把明文凭据同步为本地 seed（若需要离线登录回退 DB）：

```powershell
npx tsx scripts/sync-local-seed.ts
# 会写入 data/local-seeded-users.json（包含 bcrypt hash）
```

5. 获取 admin 的 JWT（不走 HTTP，内部调用 route）：

```powershell
npx tsx scripts/login-internal.ts
# 脚本会打印 token 和 /api/auth/me 返回的 user 对象
```

6. 在浏览器中注入 token 并直接打开 dashboard：
- 打开（或用脚本打开）下面的注入 URL（将 `<PASTE_TOKEN>` 替换为从上一步得到的 JWT）：

```
http://127.0.0.1:3000/set-token.html?token=<PASTE_TOKEN>&redirect=/dashboard
# 或（若你习惯用局域网IP）：
http://192.168.71.25:3000/set-token.html?token=<PASTE_TOKEN>&redirect=/dashboard
```

注：`public/set-token.html` 会把 token 写入 `localStorage.auth_token`，然后自动跳转到 `/dashboard`。

---

## 常见故障与诊断命令
当浏览器出现 `ERR_CONNECTION_REFUSED` 或不能访问 `http://127.0.0.1:3000` 时，按以下步骤诊断：

1. 确认 dev server 是否在运行：查看运行 `npm run dev` 的终端窗口日志。
2. 在 PowerShell 中检查端口监听和进程：

```powershell
# 列出与 3000 相关的 netstat 行（PowerShell 友好输出）
netstat -ano > C:\Windows\Temp\netstat_out.txt; Get-Content C:\Windows\Temp\netstat_out.txt | Select-String "3000"

# 或直接查看 netstat
netstat -ano | findstr 3000

# 找到 PID（例如 3472），然后查看进程信息
Get-Process -Id 3472 | Select-Object Id, ProcessName, Path, StartTime
```

3. 测试 TCP 层连通性：

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 3000 -InformationLevel Detailed
# 或
Invoke-RestMethod -Uri 'http://127.0.0.1:3000' -Method GET -TimeoutSec 5
```

4. 如果 `TcpTestSucceeded: False` 或 `Invoke-RestMethod` 报错 “由于目标计算机积极拒绝，无法连接”，说明监听进程未运行或本地网络/安全软件阻断。

5. 检查是否是 VPN / 代理 导致问题：
- 关闭 VPN 并重试；某些 VPN/代理会影响回环或本地路由。  

6. 检查防火墙（只读列出，不在文档中直接修改规则）：

```powershell
# 列出与 node.exe 相关的防火墙规则（以供参考）
Get-NetFirewallRule -PolicyStore ActiveStore | Where-Object { $_.DisplayName -match 'node' -or $_.Direction -match 'Inbound' } | Select-Object Name,DisplayName,Enabled
```

---

## 安全与清理注意事项
- `data/generated-test-accounts.json` 包含明文密码，已在本项目的 `.gitignore` 中忽略。不要把它提交到远程仓库或在公开场合泄露。  
- 本地回退 DB 仅用于开发调试。不要在生产环境中保留此回退逻辑。  

---

## 快速恢复步骤（1 分钟）
1. 运行 `npm run dev` 并确认“Local: http://localhost:3000”。  
2. 运行 `npx tsx scripts/login-internal.ts` 拿到 token。  
3. 在浏览器打开：
```
http://127.0.0.1:3000/set-token.html?token=<PASTE_TOKEN>&redirect=/dashboard
```

---

## 变更记录（本次会话）
- 新增/使用脚本：`scripts/create-test-users.ts`, `scripts/sync-local-seed.ts`, `scripts/login-internal.ts`。  
- 修改：`src/lib/tcb.ts` 增加本地 JSON 回退实现（当 CloudBase 环境变量缺失时）。  
- 新增静态注入页面：`public/set-token.html`。  
- 生成：`data/generated-test-accounts.json`（明文凭据）与 `data/local-seeded-users.json`（bcrypt hashes for local fallback）。

---

## 如果你需要我继续做（可选）
- 我可以把当前 dev server 的启动日志完整复制到这里以供存档。  
- 我可以把注入 token 的短期页面（只在本地临时可用）改为不包含长 token（更安全）。
- 把这份文档转换为仓库的 README 或添加到项目的本地开发指南中（如 `README_LOCAL.md`）。

---

完成验证：
- 我已把这份归档写入 `docs/local-login-archive.md`（见仓库）。

如果你希望我把本次会话中的某些命令或日志片段加入文档（例如 dev server 的确切启动行、PID），告诉我想要包含的内容，我会把它追加进去。

## 本地登录测试环境存档

此文档汇总了本地化登录测试时需要的环境配置、脚本与凭据文件位置，便于下次快速恢复调试。

文件与脚本

- `scripts/setup-dev-local.ps1` — PowerShell 快速设置脚本：在当前会话中设置非敏感的默认环境变量（例如 `JWT_SECRET=dev-secret`），并可选启动 dev server。
- `.env.local.example` — 示例 env 文件，复制为 `.env.local` 并在需要时填写真实 CloudBase/Tencent 凭据。
- `data/generated-test-accounts.json` — 已生成的明文测试凭据（请勿提交到远程仓库）。
- `data/local-seeded-users.json` — 本地用户文档，包含 bcrypt 密码哈希（可用于本地回退 DB）。

快速恢复步骤

1. （可选）把示例 env 复制为 `.env.local` 并按需填写：

   cp .env.local.example .env.local

   注意：不要在仓库中提交 `.env.local` 或任何包含真实密钥的文件。

2. 在 PowerShell 中执行（在项目根）：

```powershell
.\scripts\setup-dev-local.ps1
# 或启动并立即运行 dev server
.\scripts\setup-dev-local.ps1 -StartDev
```

3. 启动后访问登录页： `http://localhost:3000/login`，使用 `data/generated-test-accounts.json` 中的任意一条凭据登录。

生成或刷新测试账号

- 若要重新生成或增加测试账号，运行：

```powershell
npx tsx --env-file=.env scripts/create-test-users.ts 3
```

  - 若你已经在当前会话中设置了 CloudBase/Tencent 的环境变量，上述脚本会尝试把用户注册到真实后端。
  - 否则脚本会在本地生成用户并把文档追加到 `data/local-seeded-users.json`，以及把明文凭据写到 `data/generated-test-accounts.json`。

安全注意事项

- `data/generated-test-accounts.json` 含明文密码，勿提交到远程仓库；仓库已将其添加到 `.gitignore`（如果你需要，我也可以改为存放到其他受保护路径）。
- 本地回退 DB 仅用于开发调试。不要在生产环境中保留此回退逻辑。

若需要，我可以把这些步骤写成一键脚本或在 CI 中做模拟登录测试。
