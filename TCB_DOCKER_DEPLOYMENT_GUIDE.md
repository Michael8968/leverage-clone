# TCB Docker 部署完整指南

## 问题说明

之前部署后,用户注册功能虽然看起来正常,但数据并未写入 TCB 真实数据库,而是写入了本地 JSON mock 文件(`data/local-seeded-users.json`)。

### 根本原因

`src/lib/tcb.ts` 中的 `getTcbApp()` 函数有以下逻辑:

```typescript
if (!env || !secretId || !secretKey) {
  // 创建本地 mock 数据库
  return mockLocalDatabase();
}
```

当这三个环境变量缺失时,系统会自动回退到本地 mock,导致:
- ✗ 用户注册数据写入本地 JSON 文件
- ✗ TCB 数据库中没有记录
- ✗ 生产环境看似正常但实际未连接真实数据库

### 已修复问题

1. **Dockerfile** - 添加了所有必需的环境变量传递:
   - `TCB_ENV_ID` 
   - `CLOUDBASE_SECRET_ID`
   - `CLOUDBASE_SECRET_KEY`
   - `TENCENTCLOUD_SECRET_ID`
   - `TENCENTCLOUD_SECRET_KEY`

2. **docker-compose.yml** - 配置了正确的环境变量传递

3. **验证脚本** - 创建了 `verify-tcb-connection.js` 用于验证数据库连接

## 正确的部署流程

### 方法 1: 使用 Docker Compose (推荐用于 TCB 云开发)

#### 步骤 1: 确保 .env 文件配置正确

```bash
# 必需的环境变量
TCB_ENV_ID=leverage-test-abc123-9bn41a84185
CLOUDBASE_ENV_ID=leverage-test-abc123-9bn41a84185
CLOUDBASE_SECRET_ID=<YOUR_CLOUDBASE_SECRET_ID>
CLOUDBASE_SECRET_KEY=<YOUR_CLOUDBASE_SECRET_KEY>

# 可选但推荐
TENCENTCLOUD_SECRET_ID=<YOUR_TENCENTCLOUD_SECRET_ID>
TENCENTCLOUD_SECRET_KEY=<YOUR_TENCENTCLOUD_SECRET_KEY>
CLOUDBASE_REGION=ap-shanghai

# 其他必需变量
HUNYUAN_API_KEY=sk-EfJOZU9qgsB7aIX8J0nwKjvK3GibqgNc1ccEg0kJWzM1PmxB
JWT_SECRET=your-production-jwt-secret-change-this
```

#### 步骤 2: 本地测试构建

在 PowerShell 中运行:

```powershell
# 使用提供的脚本自动构建和测试
.\build-and-test-docker.ps1
```

或手动执行:

```powershell
# 构建镜像
docker-compose build

# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

#### 步骤 3: 验证数据库连接

```powershell
# 进入容器
docker exec -it leverage-clone-app-1 sh

# 运行验证脚本
node verify-tcb-connection.js
```

**预期输出:**

```
=== TCB 数据库连接验证 ===

检查 1/4: 环境变量
  ✓ TCB_ENV_ID: leverage***
  ✓ CLOUDBASE_SECRET_ID: AKID7GDw***
  ✓ CLOUDBASE_SECRET_KEY: UjmbCZki***

检查 2/4: @cloudbase/node-sdk 模块
  ✓ @cloudbase/node-sdk 已安装 (版本 2.11.0)

检查 3/4: TCB 应用初始化
  ✓ TCB 应用初始化成功

检查 4/4: 数据库连接测试
  ✓ 数据库实例创建成功
  ✓ 数据库查询成功
  ℹ users 集合记录数: 3

========================================
✅ 所有检查通过!
TCB 数据库连接正常,可以使用真实数据库
========================================
```

#### 步骤 4: 手动测试注册

1. 访问 `http://localhost:3000/register`
2. 注册一个新用户
3. 登录 TCB 控制台查看 `users` 集合
4. 确认新用户记录已写入

#### 步骤 5: 准备上传到 TCB

```powershell
# 导出 Docker 镜像
docker save leverage-ai:latest | gzip > leverage-ai.tar.gz

# 或者打包整个项目代码
Compress-Archive -Path . -DestinationPath leverage-project.zip -Force
```

### 方法 2: 直接上传项目代码到 TCB

如果您的 TCB 环境支持自动构建 Docker,可以直接上传代码:

#### 步骤 1: 准备部署包

```powershell
# 创建部署目录
$deployDir = "leverage-deployment"
New-Item -ItemType Directory -Force -Path $deployDir

# 复制必需文件
Copy-Item -Path "src","public","scripts",".next","package.json","package-lock.json","tsconfig.json","next.config.js","Dockerfile","docker-compose.yml",".env" -Destination $deployDir -Recurse

# 压缩
Compress-Archive -Path $deployDir -DestinationPath "leverage-deployment.zip" -Force
```

#### 步骤 2: 上传到 TCB

1. 登录 TCB 控制台
2. 选择环境: `leverage-test-abc123-9bn41a84185`
3. 进入"云托管"或"容器服务"
4. 上传 `leverage-deployment.zip`
5. TCB 会自动解压并执行 Docker 构建

#### 步骤 3: 配置 TCB 环境变量

在 TCB 控制台中设置以下环境变量:

```
TCB_ENV_ID=leverage-test-abc123-9bn41a84185
CLOUDBASE_ENV_ID=leverage-test-abc123-9bn41a84185
CLOUDBASE_SECRET_ID=<YOUR_CLOUDBASE_SECRET_ID>
CLOUDBASE_SECRET_KEY=<YOUR_CLOUDBASE_SECRET_KEY>
TENCENTCLOUD_SECRET_ID=<YOUR_TENCENTCLOUD_SECRET_ID>
TENCENTCLOUD_SECRET_KEY=<YOUR_TENCENTCLOUD_SECRET_KEY>
HUNYUAN_API_KEY=sk-EfJOZU9qgsB7aIX8J0nwKjvK3GibqgNc1ccEg0kJWzM1PmxB
JWT_SECRET=your-production-jwt-secret-change-this
NODE_ENV=production
PORT=3000
```

⚠️ **重要**: 必须在 TCB 控制台配置这些环境变量,不能仅依赖 .env 文件!

#### 步骤 4: 重启服务

TCB 配置环境变量后,重启容器服务使其生效。

#### 步骤 5: 生产环境验证

```bash
# SSH 到 TCB 容器实例
tcb run exec --env-id leverage-test-abc123-9bn41a84185

# 在容器内运行验证
node verify-tcb-connection.js
```

## 验证清单

完成部署后,请按以下清单验证:

### 1. 环境变量检查

- [ ] `TCB_ENV_ID` 已设置
- [ ] `CLOUDBASE_SECRET_ID` 已设置  
- [ ] `CLOUDBASE_SECRET_KEY` 已设置
- [ ] 容器内运行 `echo $TCB_ENV_ID` 能看到正确值

### 2. 数据库连接检查

- [ ] 运行 `node verify-tcb-connection.js` 全部通过
- [ ] 日志中无 "using local mock database" 警告
- [ ] 日志中能看到 TCB 连接成功信息

### 3. 功能测试

- [ ] 访问 `/register` 页面正常显示
- [ ] 注册新用户成功
- [ ] TCB 控制台 `users` 集合中出现新记录
- [ ] 登录功能正常
- [ ] 用户信息正确显示

### 4. 日志检查

查看应用日志,确认:
- [ ] 无 "Cannot find module '@cloudbase/node-sdk'" 错误
- [ ] 无 "环境变量未设置" 警告
- [ ] 数据库操作日志正常

## 常见问题排查

### 问题 1: 注册成功但 TCB 中没有数据

**症状**: 
- 前端显示注册成功
- 可以登录(因为数据在本地 mock)
- TCB `users` 集合没有新记录

**原因**: 系统使用了本地 mock 数据库

**解决**:
```bash
# 进入容器检查环境变量
docker exec -it <container-id> sh
env | grep TCB
env | grep CLOUDBASE

# 如果为空,说明环境变量未传递
# 需要在 TCB 控制台配置或修改 docker-compose.yml
```

### 问题 2: Cannot find module '@cloudbase/node-sdk'

**症状**: 日志中出现模块找不到错误

**原因**: Dockerfile 中 `COPY --from=deps` 没有复制 node_modules

**解决**: 已在新版 Dockerfile 中修复,重新构建镜像

### 问题 3: 数据库查询超时

**症状**: `verify-tcb-connection.js` 第4步失败

**原因**: 
- 网络连接问题
- Secret ID/Key 无效
- TCB 环境 ID 错误

**解决**:
```bash
# 检查网络连接
ping cloud.tencent.com

# 验证 TCB 环境 ID
curl "https://tcb-api.tencentcloudapi.com/?envId=leverage-test-abc123-9bn41a84185"

# 检查密钥权限(在 TCB 控制台)
```

### 问题 4: 本地测试正常,TCB 部署后失败

**症状**: 本地 Docker 运行正常,上传到 TCB 后数据库连接失败

**原因**: TCB 环境变量配置不完整

**解决**:
1. 登录 TCB 控制台
2. 进入"云托管" → "环境变量"
3. 确认所有必需变量都已配置
4. 重启服务使环境变量生效

## 最佳实践

### 1. 环境变量管理

- **本地开发**: 使用 `.env` 文件
- **Docker 构建**: 通过 `--build-arg` 传递
- **TCB 部署**: 在控制台配置环境变量
- **不要**: 将 `.env` 文件打包到镜像中

### 2. 安全性

- 生产环境使用强 `JWT_SECRET` (32位以上随机字符串)
- 定期轮换 TCB Secret ID/Key
- 不要将密钥提交到 Git

### 3. 验证流程

每次部署后必须执行:
```bash
node verify-tcb-connection.js  # 验证数据库连接
curl http://localhost:3000/api/health  # 验证服务健康
```

### 4. 监控和日志

- 启用 TCB 日志收集
- 监控数据库连接错误
- 定期检查 `users` 集合增长情况

## 快速诊断命令

```bash
# 检查容器状态
docker ps | grep leverage

# 查看容器日志(最近 100 行)
docker logs --tail 100 <container-id>

# 进入容器
docker exec -it <container-id> sh

# 在容器内检查
env | grep -E "TCB|CLOUDBASE"  # 查看环境变量
ls -la node_modules/@cloudbase  # 检查 SDK
node -e "console.log(require('@cloudbase/node-sdk'))"  # 测试加载

# 验证数据库
node verify-tcb-connection.js

# 查看网络连接
netstat -an | grep 3000
```

## 回滚方案

如果部署失败需要回滚:

```bash
# 1. 停止新版本
docker stop <new-container-id>

# 2. 启动旧版本
docker start <old-container-id>

# 3. 或者重新部署上一个版本
docker run -d --env-file .env.old leverage-ai:previous

# 4. 验证回滚成功
curl http://localhost:3000/api/health
```

## 总结

关键点:
1. ✅ 必须传递 `TCB_ENV_ID`, `CLOUDBASE_SECRET_ID`, `CLOUDBASE_SECRET_KEY` 环境变量
2. ✅ 使用 `verify-tcb-connection.js` 验证连接
3. ✅ 在 TCB 控制台配置环境变量(不只是 .env 文件)
4. ✅ 每次部署后必须测试注册功能并检查 TCB 数据库

按照此指南操作,可以确保用户注册数据正确写入 TCB 真实数据库。
