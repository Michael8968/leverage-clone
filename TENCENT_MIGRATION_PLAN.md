# 腾讯云全面迁移方案（从 Firebase/Firestore/云函数）

本方案目标：将现有功能从 Firebase 生态（Auth、Firestore、Storage、Functions 等）平滑迁移至腾讯云（CloudBase/SCF/COS/数据库 等），在最小改动前提下保持功能一致，逐步替换底层服务。

## 总体路线

- 分层改造：先抽象数据访问和服务调用层（DataStore/Storage/Functions/AI），再接入腾讯云实现，最后切换环境变量启用。
- 双栈过渡：保留 Firebase Admin 适配作为回退，在灰度阶段可通过环境变量一键切换。
- 基础设施：
  - 数据库：优先选择 CloudBase（TCB）文档数据库（兼容 JSON 文档/增量更新/服务器时间），如需强一致/复杂事务可评估 TDSQL-C（MySQL/PG）。
  - 云函数：使用腾讯云 Serverless Cloud Function（SCF）并配合 API 网关；或 CloudBase Functions（如使用 TCB 一体化）。
  - 存储：对象存储 COS 替代 Firebase Storage。
  - 身份：如继续使用前端登录，可采用 CloudBase 身份认证（匿名/邮箱/微信/自定义登录），或结合现有账号体系自建 JWT。
  - AI：混元模型已通过 OpenAI 兼容接口适配（baseURL + HUNYUAN_API_KEY），继续沿用。

## 映射关系与改造点

- Firestore → CloudBase（TCB）数据库
  - 集合（collection）/文档（doc）保持命名一致（例如 users、points_transactions 等）。
  - 时间：Firestore Timestamp → TCB `db.serverDate()`。
  - 自增：Firestore `increment()` → TCB `db.command.inc()`。

- Firebase Functions → 腾讯云 SCF
  - 将现有 API Route 或后台任务拆分为云函数；通过 API 网关或定时触发器（定时器）触发。
  - 本项目 App Router 的 API Route 可继续在 Next.js 中运行；若需下沉到 SCF，复用相同的业务层即可。

- Firebase Storage → 腾讯云 COS
  - 文件上传/读取接口更换为 COS SDK/临时密钥签名。
  - 访问域名与 CDN 配置在 COS 控制台配置。

- Firebase Auth → CloudBase Auth 或自建
  - 如需保留现有用户体系，建议自建 JWT（后端验证）或接入 CloudBase 认证能力。

## 环境变量规范

- 基础：
  - DATASTORE=tcb           # 选择使用 TCB 作为数据层
  - TCB_ENV_ID=xxx          # 或 CLOUDBASE_ENV_ID
  - TENCENTCLOUD_SECRET_ID=xxx
  - TENCENTCLOUD_SECRET_KEY=xxx
  - TENCENTCLOUD_REGION=ap-guangzhou
  - HUNYUAN_API_KEY=xxx     # 混元 OpenAI 兼容 Key（已集成）

- 兼容/回退：
  - DATASTORE=firebase-admin + FIREBASE_SERVICE_ACCOUNT_KEY + NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

## 代码改造（已完成 - 第一阶段）

- 新增抽象层：`src/lib/datastore/` 定义 `PointsStore` 接口与工厂 `getPointsStore()`。
- 新增实现：
  - `tcb-points.ts`：基于 `@cloudbase/node-sdk` 的积分扣减/交易记录实现，使用 `eval('require')` 懒加载避免打包冲突。
  - `firebase-points.ts`：基于 Firebase Admin 的回退实现。
  - `noop-points.ts`：无后端占位实现（开发环境）。
- 业务接入：`src/ai/flows/prompt-execution-flow.ts` 切换为通过 `getPointsStore()` 扣减积分，主逻辑不再依赖 Firestore 客户端。
- Webpack 映射：将 `firebase/firestore` 运行时映射到 `src/lib/cloudbase-compat.ts`，客户端读写通过 `/api/*` 路由转发至后端实现。
- API 改造：`/api/products`、`/api/suppliers`、`/api/users`、`/api/demands`、`/api/ai-scenarios` 在 `DATASTORE=tcb` 时直连 TCB，未配置时回退本地 JSON。
- 认证改造（后端）：新增 `/api/auth/register`、`/api/auth/login`、`/api/auth/me`，基于 TCB + bcrypt + JWT。
- 认证改造（前端）：`/login`、`/register` 页面在未启用 Firebase 客户端时改为调用上述后端接口；`AuthProvider` 在未启用 Firebase 客户端时改为 JWT 回退模式。
- TCB 工具：新增 `src/lib/tcb.ts`（惰性初始化）。
- 云函数示例：新增 `scf/functions/pointsGrant` 与 `scf/README.md`。

## 后续改造计划（第二阶段）

- 数据层全面抽象化：为 users、demands、suppliers、products 等集合建立 Repository 接口与 TCB 实现。
- 存储替换：封装 `StorageService`，提供 Firebase Storage 与 COS 双实现；页面/API 切换到抽象层。
- 云函数迁移：将定时任务、批量授予积分、报表生成等后台任务下沉至 SCF，复用现有业务模块。
- 鉴权与会话：接入 CloudBase Auth 或自建 JWT（结合 SCF 校验）。
- 数据迁移脚本：
  - 导出 Firestore 数据（或使用现有 `data/*.json`）
  - 编写导入脚本到 TCB（`scripts/migrate-to-tcb.ts`），处理时间与自增字段差异。

## 部署与验证

- 本地验证：设置 `DATASTORE=tcb` 并配置 TCB 凭据，运行现有测试脚本验证 `/api/executePrompt` 返回 `cost=10` 且 TCB 中产生交易记录。
- 生产部署：
  - Next.js 可继续使用容器/Dockerfile 部署（output: standalone）；
  - 也可选择 CloudBase 静态托管 + 云函数网关（视架构倾向）。

## 回滚与风控

- 保留 Firebase Admin 适配作为快速回滚路径：`DATASTORE=firebase-admin`。
- 新老数据双写（可选）：迁移窗口期在两个后端同时写入，读走新库；窗口结束后关闭旧库写入。

---

如需我继续完成“用户、商品、供应商”等数据层的 TCB 适配与迁移脚本，我可以直接补齐接口与脚本，并给出一键验证步骤。