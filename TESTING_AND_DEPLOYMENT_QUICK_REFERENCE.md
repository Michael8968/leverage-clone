# 测试和部署快速参考

## ⚡ 快速命令

### 运行测试
```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/integration/data-flows.test.ts

# 运行 API 端点测试（需要服务器）
npm test -- tests/integration/api-endpoints.test.ts

# 监视模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

### 代码质量检查
```bash
# TypeScript 类型检查
npm run typecheck

# ESLint 检查
npm run lint

# 构建验证
npm run build
```

### 部署操作
```bash
# 本地启动服务器
npm run dev

# 手动触发 GitHub Actions 工作流
# 1. 进入 GitHub 仓库 → Actions
# 2. 选择 "TCB Deployment" 
# 3. 点击 "Run workflow"
```

---

## 📁 关键文件

| 文件 | 说明 |
|------|------|
| `.github/workflows/tcb-deploy.yml` | GitHub Actions 部署工作流 |
| `tests/integration/data-flows.test.ts` | 数据流集成测试 (33/33 ✅) |
| `tests/integration/api-endpoints.test.ts` | API 端点测试 |
| `tests/setup.ts` | Jest 环境设置 |
| `package.json` | Jest 配置 |

---

## 🔑 必要的 GitHub Secrets

部署前需要配置 8 个 GitHub Secrets：

| Secret | 说明 |
|--------|------|
| `TCB_REGISTRY_USERNAME` | Tencent Cloud 镜像仓库用户名 |
| `TCB_REGISTRY_PASSWORD` | Tencent Cloud 镜像仓库密码 |
| `TCB_ENV_ID` | CloudBase 环境 ID |
| `TCB_SECRET_KEY` | CloudBase 密钥 |
| `TCB_API_KEY_ID` | TCB API 密钥 ID |
| `TCB_API_KEY` | TCB API 密钥 |
| `JWT_SECRET` | JWT 密钥 |
| `HUNYUAN_API_KEY` | 混元 API 密钥（可选） |

**配置步骤**:
1. 进入 GitHub 仓库 Settings
2. Secrets and variables → Actions
3. 点击 "New repository secret"
4. 输入 secret 名称和值

---

## 📊 测试覆盖概览

### ✅ 完成的测试

#### 数据流测试 (33 个)
- Demand → Matching → Assignment (4 个)
- LLM → Prompt → Scenario (7 个)
- Supplier → Products → Search (8 个)
- API 集成 (12+ 个)
- 错误处理 (4 个)
- 性能测试 (2 个)

#### API 端点测试 (16 个)
- 健康检查 API (2 个)
- 提示词管理 (2 个)
- AI 场景管理 (2 个)
- LLM 连接 (2 个)
- 供应商和商品 (4 个)
- 错误处理 (2 个)
- 性能测试 (2 个)

---

## 🚀 部署流程

### 自动部署（推荐）
```bash
# 推送代码到 main 或 production 分支
git push origin main

# GitHub Actions 自动运行工作流
```

### 手动部署
1. GitHub → Actions → TCB Deployment
2. Run workflow → 选择环境 → Confirm

### 部署阶段
1. 🔍 **代码质量检查** (2 min)
2. 🐳 **Docker 构建和推送** (3-5 min)
3. ☁️ **TCB 部署** (2 min)
4. 💚 **健康检查** (最多 100s)
5. 📢 **通知** (1 min)

**总计**: ~8-12 分钟

---

## ✅ 预检查清单

### 推送代码前
- [ ] `npm run typecheck` 无错误
- [ ] `npm run lint` 无错误
- [ ] `npm run build` 成功
- [ ] `npm test` 通过
- [ ] 本地功能测试通过

### 部署前
- [ ] GitHub Secrets 已配置
- [ ] Slack Webhook 已配置（可选）
- [ ] TCB 环境已准备
- [ ] 备份已完成（生产环境）

### 部署后
- [ ] 部署通知已收到
- [ ] API 端点可用
- [ ] 日志无错误
- [ ] 功能正常运行

---

## 🔧 常见问题

### Q: 测试如何在没有真实 API 的情况下运行？
**A**: 数据流测试使用模拟数据工厂函数，无需外部 API。API 端点测试在服务器不运行时会失败，但代码和框架是完整的。

### Q: 如何在本地测试部署工作流？
**A**: 可以在本地运行 Docker 和 npm 命令来验证：
```bash
npm run build          # 验证构建
docker build .         # 验证 Dockerfile
```

### Q: 部署失败了怎么办？
**A**: 查看 GitHub Actions 日志：
1. 进入 GitHub → Actions
2. 找到失败的工作流
3. 点击失败的 job 查看详细错误
4. 根据错误信息修复问题

### Q: 如何回滚部署？
**A**: 可以通过以下方式：
1. 推送上一个提交（如果是新代码错误）
2. 或手动通过 TCB 控制台回滚
3. 或推送修复代码并重新部署

### Q: 测试需要多长时间？
**A**: 
- 全部测试: ~1-2 秒
- 数据流测试: ~750ms
- API 端点测试: ~1s (如果服务器运行中)

---

## 📈 监控和日志

### GitHub Actions 日志
- **位置**: GitHub → Actions → 工作流名称
- **查看**: 每个 job 的完整输出
- **导出**: 可下载日志文件

### API 部署日志
- **位置**: TCB 云函数控制台
- **检查**: 应用启动日志
- **错误**: 查看 stderr 输出

### 实时监控
```bash
# 本地查看应用日志
npm run dev

# 生产环境查看日志
# 在 TCB 控制台查看云函数日志
```

---

## 🔗 相关资源

- [完整实现文档](./TEST_AND_DEPLOYMENT_IMPLEMENTATION.md)
- [GitHub Actions 工作流](../.github/workflows/tcb-deploy.yml)
- [集成测试代码](../tests/integration/)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [生产检查清单](./docs/PRODUCTION_CHECKLIST.md)

---

## 👥 支持

遇到问题？查看以下资源：
1. 📖 查看完整文档
2. 🔍 检查 GitHub Actions 日志
3. 🐛 查看项目问题跟踪
4. 💬 联系开发团队

---

**最后更新**: 2024年
**版本**: 1.0
**状态**: ✅ 生产就绪
