# TCB API 全验证测试脚本

使用axios循环测试所有端点，包含mock data，assert 200 + 预期输出。集成Jest框架。

## 功能特性

- ✅ **全端点覆盖**: 测试所有18个已转换的TCB API端点
- ✅ **Mock数据**: 预定义的测试数据和预期响应
- ✅ **Jest集成**: 完整的测试框架支持
- ✅ **错误处理**: 包含重试机制和错误场景测试
- ✅ **集成测试**: 需求池路由流程的端到端测试
- ✅ **性能测试**: 并发请求处理能力验证
- ✅ **认证测试**: JWT token验证和错误处理

## 测试端点列表

### 管理/AI函数 (3个)
- `getPlatformAssets` - 获取LLM平台资产
- `getPrompts` - 获取提示模板
- `executePrompt` - 执行AI提示

### 用户管理函数 (1个)
- `batchUpdateUsers` - 批量更新用户

### 业务函数 (6个)
- `getProductRecommendations` - 产品推荐
- `recommendCreatives` - 创意者推荐
- `createPrivateDemand` - 创建私有需求
- `clarifyDemandDetails` - 需求澄清
- `intelligentRoutingFlow` - 智能路由
- `evaluateSellerData` - 供应商数据评估

### 内容生成函数 (4个)
- `generate3dModel` - 3D模型图像生成
- `generateTripo3dModel` - Tripo3D模型生成
- `getTripo3dModelStatus` - Tripo3D状态查询
- `generateNanoBananaImage` - Nano Banana图像生成

### 多媒体函数 (2个)
- `getUploadUrlForMediaAsset` - 媒体资源上传URL生成
- `analyzeMediaAsset` - 媒体资源分析

## 环境配置

### 环境变量

```bash
# API基础URL
TCB_API_BASE_URL=http://localhost:3000

# Mock JWT Token (需要根据实际认证系统调整)
MOCK_JWT_TOKEN=your-mock-jwt-token-here
```

### 测试配置

```javascript
const TEST_CONFIG = {
  timeout: 30000, // 30秒超时
  retries: 2,     // 重试次数
};
```

## 使用方法

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境

创建 `.env.test` 文件：

```bash
cp .env.example .env.test
# 编辑 .env.test 设置测试环境变量
```

### 3. 运行测试

```bash
# 运行所有API测试
npm run test:api

# 监听模式运行
npm run test:api:watch

# 运行所有Jest测试
npm test
```

### 4. 直接运行脚本

```bash
# 使用Node直接运行
node scripts/tcb-api-full-validation.test.js
```

## 测试结构

### 单元测试
每个端点都有独立的测试用例，验证：
- HTTP状态码 (200)
- 响应格式
- 业务逻辑正确性
- 数据类型验证

### 集成测试
- **需求池路由流程**: 创建需求 → 澄清需求 → 智能路由
- **并发性能测试**: 同时测试多个端点
- **错误处理测试**: 无效认证、无效数据等场景

### 性能测试
- 并发请求处理能力
- 响应时间监控
- 成功率统计

## 测试输出示例

```
🚀 开始TCB API全验证测试
📍 测试环境: http://localhost:3000
🔢 待测试端点数量: 16

🧪 测试端点: getPlatformAssets (POST /api/v1/admin/getPlatformAssets)
✅ getPlatformAssets 测试通过

🧪 测试端点: executePrompt (POST /api/v1/core/executePrompt)
✅ executePrompt 测试通过

🔄 开始集成测试：需求池路由流程
✅ 需求池路由流程集成测试通过

⚡ 开始性能测试：并发请求
✅ 并发测试完成: 5/5 成功

🚫 测试错误处理：无效认证
✅ 无效认证错误处理正确

🏁 TCB API全验证测试完成
```

## 自定义测试

### 添加新端点测试

在 `TEST_CASES` 数组中添加新的测试用例：

```javascript
{
  name: 'yourFunctionName',
  endpoint: `${API_PREFIX}/category/yourFunctionName`,
  method: 'POST',
  data: { /* mock input data */ },
  expectedStatus: 200,
  validateResponse: (res) => {
    // 自定义验证逻辑
    expect(res.data.success).toBe(true);
    expect(res.data.data.yourField).toBeDefined();
  },
}
```

### 修改Mock数据

更新测试用例中的 `data` 字段来修改输入数据。

### 自定义验证逻辑

修改 `validateResponse` 函数来添加特定的业务逻辑验证。

## 注意事项

1. **认证**: 确保 `MOCK_JWT_TOKEN` 是有效的测试token
2. **环境**: 测试环境需要运行完整的API服务
3. **数据**: Mock数据可能需要根据实际业务逻辑调整
4. **网络**: 确保测试环境网络连接稳定
5. **依赖**: 某些测试可能依赖其他服务的可用性

## 故障排除

### 常见问题

1. **认证失败**: 检查 `MOCK_JWT_TOKEN` 是否正确
2. **连接超时**: 检查API服务是否运行在正确端口
3. **数据验证失败**: 检查Mock数据格式是否符合API要求
4. **依赖服务不可用**: 确保所有相关服务都已启动

### 调试模式

```bash
# 启用详细日志
DEBUG=true npm run test:api

# 只运行特定测试
npm run test:api -- --testNamePattern="getPlatformAssets"
```

## 扩展计划

- [ ] 添加更多集成测试场景
- [ ] 实现测试数据生成器
- [ ] 添加性能基准测试
- [ ] 支持测试报告生成
- [ ] 集成CI/CD流水线

---

**PRD**: 链接AI导购功能，覆盖需求池/路由等核心业务流程。