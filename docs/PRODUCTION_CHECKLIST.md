# 生产发布检查清单

本清单旨在在“不修改功能和 UI”的前提下，确保应用可稳定上线并便于排障。

## 环境与密钥

务必基于 `.env.example` 配置 `.env`（本地）或环境变量（云端）：

必填（核心）
- JWT_SECRET：用户鉴权用签名密钥
- DATASTORE=tcb（或设置 USE_TCB=1）
- TCB_ENV_ID（或 CLOUDBASE_ENV_ID）
- TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY

强烈建议/可选
- TENCENTCLOUD_REGION（默认 ap-guangzhou）
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET（用于拼接公开的 GCS URL）
- NEXT_PUBLIC_TCB_PUBLIC_BASE / NEXT_PUBLIC_ASSETS_BASE（公开资源域名）
- HUNYUAN_API_KEY（使用 Hunyuan 相关 AI 流程）
- HUNYUAN_BASE_URL / HUNYUAN_MODEL（可选覆盖）
- LITELLM_PROXY_URL（若使用代理）
- OPENAI_API_KEY / GOOGLE_IMAGEN_API_KEY / IMAGE_GEN_API_KEY（可选）

## 质量关口

- TypeScript 类型检查：通过
- ESLint（Flat config，Next 15 适配）：0 error（warning 可后续处理）
- 生产构建：成功（Next.js 15.5.6）

本仓库已完成以上三项验证。

## 运行方式

容器化（推荐）
- 构建镜像：使用 `Dockerfile`
- 运行容器：确保容器内注入上述运行时环境变量

Node 进程（PM2/systemd）
- 安装依赖：npm ci
- 预构建：npm run build
- 启动：npm start（或使用 .deploy/server.js 自定义入口）

## 可观测性与日志

- 确认云厂商/平台日志采集开启（stdout/stderr）
- 保留 14-30 天日志留存策略
- 将关键 API 的 error 日志收敛到同一搜索标签

## 健康检查/存活检测

- HTTP 200 健康检查端点（如 `/` 或 `/api/health`）
- 启动宽限期 >= 30s（首次冷启动）
- Readiness/ Liveness 探针分别配置

## 安全加固

- 所有密钥仅通过环境变量注入，避免入仓
- JWT_SECRET 使用高强度随机值
- 生产环境禁止 `src/app/api/dev/*` 开发者接口
- 确认 CORS / 反向代理 仅允许预期来源

## 备份与回滚

- 镜像/包版本化管理（不可变构件）
- 部署支持一键回滚到上一个稳定版本

## 上线前自检（快速）

- 访问首页、登录页、创意师工作台
- 上传一次示例作品（若配置了公开存储）
- 触发 1 次 AI 能力（若配置了 Hunyuan/代理）
- 基础 API：/api/users、/api/suppliers 返回 200

## 已知非阻断项（后续优化）

- 部分 ESLint 规则为 warning（如 setState in effect、转义字符等），后续迭代逐步消除
- 命名中仍存在 `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`（兼容用途，后续可更名为更中性的变量名）

---

若需要，我可以为你的部署平台（如 Vercel、Cloud Studio、K8s 或云函数）生成一份更具体的发布指引（包含变量注入、健康探针、滚动升级策略等）。
