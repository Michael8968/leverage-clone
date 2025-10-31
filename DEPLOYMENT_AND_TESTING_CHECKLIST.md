# TCB API 完整部署和测试清单

## 📋 部署和测试流程总览

| 步骤 | 工具/命令 | 检查点 | 预期结果 |
|------|-----------|--------|----------|
| **1. 环境准备** | `tcb login` | TCB CLI登录状态 | 登录成功，显示用户信息 |
| | `tcb env:list` | 环境ID确认 | 显示 `leverage-test-abc123-9bn41a84185` |
| | `npm run build` | Next.js构建 | 构建成功，无错误 |
| | `tcb functions:deploy` | 云函数部署 | 18个函数全部部署成功 |

## 🚀 部署阶段

| 步骤 | 工具/命令 | 检查点 | 预期结果 |
|------|-----------|--------|----------|
| **2. 云函数部署** | `tcb functions:deploy functions/*` | TCB控制台API列表 | 所有18个端点可见：<br/>• 3个管理/AI函数<br/>• 1个用户管理函数<br/>• 6个业务函数<br/>• 4个内容生成函数<br/>• 2个多媒体函数 |
| | `tcb functions:list` | 函数状态 | 所有函数状态为 `Active` |
| | `tcb functions:logs --tail` | 部署日志 | 无错误日志，显示成功部署 |

## 🧪 单元测试阶段

| 步骤 | 工具/命令 | 检查点 | 预期结果 |
|------|-----------|--------|----------|
| **3. Postman集合测试** | 导入所有Postman JSON文件：<br/>• `getPlatformAssets-postman-test.json`<br/>• `getPrompts-postman-test.json`<br/>• `executePrompt-postman-test.json`<br/>• `batchUpdateUsers-postman-test.json`<br/>• `getProductRecommendations-postman-test.json`<br/>• `recommendCreatives-postman-test.json`<br/>• `createPrivateDemand-postman-test.json`<br/>• `clarifyDemandDetails-postman-test.json`<br/>• `intelligentRoutingFlow-postman-test.json`<br/>• `evaluateSellerData-postman-test.json`<br/>• `generate3dModel-postman-test.json`<br/>• `generateTripo3dModel-postman-test.json`<br/>• `getTripo3dModelStatus-postman-test.json`<br/>• `generateNanoBananaImage-postman-test.json`<br/>• `getUploadUrlForMediaAsset-postman-test.json`<br/>• `analyzeMediaAsset-postman-test.json` | 每个API payload | **200 OK**，**JSON非空**：<br/>• `success: true`<br/>• `data` 字段存在<br/>• 业务数据完整 |
| | Postman Runner批量执行 | 测试结果 | 16/16 测试通过 (100%) |
| | 响应时间监控 | 平均响应时间 | < 2秒 |

## 🔗 集成测试阶段

| 步骤 | 工具/命令 | 检查点 | 预期结果 |
|------|-----------|--------|----------|
| **4. 前端集成测试** | 启动Next.js应用：<br/>`npm run start` | 浏览器访问 `http://localhost:3000` | 应用正常加载 |
| | 登录测试账户 | Dashboard页面 | 成功登录，无错误 |
| | 调用 `getProductRecommendations` | 浏览器Network面板 | **无错误**：<br/>• HTTP 200<br/>• 响应时间 < 2s<br/>• JSON数据完整 |
| | 完整PRD流程测试：<br/>推荐 → 需求池 | 用户操作流程 | **PRD流程通**：<br/>• 产品推荐显示<br/>• 需求创建成功<br/>• 路由分配正常 |

## 🏥 错误处理和负载测试

| 步骤 | 工具/命令 | 检查点 | 预期结果 |
|------|-----------|--------|----------|
| **5. 错误场景测试** | 模拟网络断开：<br/>• 禁用网络连接<br/>• 调用任意API | 前端错误处理 | **友好msg**：<br/>• 显示 "加载中~"<br/>• 无崩溃<br/>• 优雅降级 |
| | TCB日志监控：<br/>`tcb functions:logs --tail` | 错误日志 | 错误正确记录：<br/>• 超时错误<br/>• 网络异常<br/>• 降级处理 |
| | 恢复网络连接 | 功能恢复 | 自动恢复正常功能 |

## 🎯 全覆盖端到端测试

| 步骤 | 工具/命令 | 检查点 | 预期结果 |
|------|-----------|--------|----------|
| **6. 端到端流程测试** | `tcb functions:logs --tail` | 实时日志监控 | 完整业务流程：<br/>1. 用户发布需求<br/>2. AI分析需求<br/>3. 匹配创意者<br/>4. 智能路由分配 |
| | 性能指标监控 | PRD指标达成 | **响应<2s**：<br/>• API响应时间<br/>• 前端渲染时间<br/>• 数据库查询时间 |
| | 匹配质量验证 | 匹配结果 | **匹配>3**：<br/>• 创意者推荐 ≥3个<br/>• 路由分配成功<br/>• 用户满意度高 |

## 📊 监控和告警

| 步骤 | 工具/命令 | 检查点 | 预期结果 |
|------|-----------|--------|----------|
| **7. 生产监控** | `tcb functions:metrics` | 性能指标 | • CPU使用率 < 70%<br/>• 内存使用 < 80%<br/>• 错误率 < 1% |
| | 设置告警规则 | TCB控制台 | • 响应时间 > 5s 告警<br/>• 错误率 > 5% 告警<br/>• 函数不可用告警 |
| | 日志分析 | 错误模式识别 | 无重复错误模式 |

## 🔄 回滚计划

| 步骤 | 工具/命令 | 检查点 | 预期结果 |
|------|-----------|--------|----------|
| **8. 回滚准备** | `tcb functions:deploy --rollback` | 版本控制 | 可快速回滚到上一版本 |
| | 备份数据 | 数据库快照 | 关键数据已备份 |
| | 灰度发布 | 流量控制 | 10%流量测试通过后全量发布 |

## 📈 验收标准

### ✅ 功能验收
- [ ] 所有18个API端点部署成功
- [ ] Postman测试100%通过
- [ ] 前端集成无错误
- [ ] 端到端流程完整

### ✅ 性能验收
- [ ] API响应时间 < 2秒
- [ ] 前端加载时间 < 3秒
- [ ] 并发用户支持 > 100
- [ ] 错误率 < 1%

### ✅ 业务验收
- [ ] 产品推荐准确性 > 80%
- [ ] 创意者匹配数量 ≥ 3
- [ ] 用户发布需求成功率 100%
- [ ] AI路由分配准确率 > 85%

## 🛠️ 故障排除

### 常见问题
1. **部署失败**: 检查环境变量和权限
2. **API调用失败**: 验证JWT token和请求格式
3. **前端错误**: 检查CORS配置和网络连接
4. **性能问题**: 监控数据库查询和AI服务调用

### 紧急联系
- 技术负责人: [联系方式]
- TCB支持: [腾讯云控制台]
- 监控告警: [告警接收人]

---

**最后更新**: 2025年10月31日
**版本**: v1.0
**负责人**: AI Assistant