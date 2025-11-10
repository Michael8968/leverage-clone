# 容器化部署指南

## 📋 前置要求

### 1. 安装 Docker Desktop
- 下载地址: https://www.docker.com/products/docker-desktop/
- 安装后启动 Docker Desktop
- 确认运行: `docker --version`

### 2. 验证 Docker 状态
```powershell
docker --version
docker ps
```

## 🚀 快速部署步骤

### 步骤 1: 构建 Docker 镜像

```powershell
docker build -t leverage-ai `
  --build-arg HUNYUAN_API_KEY=your_hunyuan_api_key `
  --build-arg TCB_ENV_ID=your_tcb_env_id `
  --build-arg CLOUDBASE_ENV_ID=your_tcb_env_id `
  --build-arg CLOUDBASE_SECRET_ID=your_secret_id `
  --build-arg CLOUDBASE_SECRET_KEY=your_secret_key `
  --build-arg TENCENTCLOUD_SECRET_ID=your_secret_id `
  --build-arg TENCENTCLOUD_SECRET_KEY=your_secret_key `
  .
```

**预计时间**: 5-10 分钟

### 步骤 2: 运行容器

```powershell
docker run -d `
  -p 3000:3000 `
  --name leverage-ai-app `
  --env-file .env.local `
  leverage-ai
```

### 步骤 3: 验证部署

```powershell
# 查看容器日志
docker logs leverage-ai-app

# 查看容器状态
docker ps

# 访问应用
# 浏览器打开: http://localhost:3000
```

## 🔍 详细说明

### 构建参数说明

| 参数 | 说明 | 值 |
|------|------|-----|
| `HUNYUAN_API_KEY` | 腾讯混元 API 密钥 | 已配置 |
| `TCB_ENV_ID` | TCB 环境 ID | cloud1-7galmfiu70af91a6 |
| `CLOUDBASE_ENV_ID` | 云开发环境 ID（同上）| cloud1-7galmfiu70af91a6 |
| `CLOUDBASE_SECRET_ID` | TCB 密钥 ID | 已配置 |
| `CLOUDBASE_SECRET_KEY` | TCB 密钥 Key | 已配置 |
| `TENCENTCLOUD_SECRET_ID` | 腾讯云密钥 ID | 已配置 |
| `TENCENTCLOUD_SECRET_KEY` | 腾讯云密钥 Key | 已配置 |

### 运行参数说明

- `-d`: 后台运行
- `-p 3000:3000`: 端口映射（本地:容器）
- `--name leverage-ai-app`: 容器名称
- `--env-file .env.local`: 环境变量文件

## 🛠️ 常用命令

### 容器管理

```powershell
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 停止容器
docker stop leverage-ai-app

# 启动容器
docker start leverage-ai-app

# 重启容器
docker restart leverage-ai-app

# 删除容器
docker rm leverage-ai-app

# 删除镜像
docker rmi leverage-ai
```

### 日志和调试

```powershell
# 查看实时日志
docker logs -f leverage-ai-app

# 查看最近 100 行日志
docker logs --tail 100 leverage-ai-app

# 进入容器 shell
docker exec -it leverage-ai-app sh

# 查看容器详细信息
docker inspect leverage-ai-app
```

### 镜像管理

```powershell
# 查看本地镜像
docker images

# 查看镜像大小
docker images leverage-ai

# 清理未使用的镜像
docker image prune
```

## 🔄 更新部署

当代码有更新时：

```powershell
# 1. 停止并删除旧容器
docker stop leverage-ai-app
docker rm leverage-ai-app

# 2. 删除旧镜像（可选）
docker rmi leverage-ai

# 3. 重新构建镜像
docker build -t leverage-ai [参数...] .

# 4. 重新运行容器
docker run -d -p 3000:3000 --name leverage-ai-app --env-file .env.local leverage-ai
```

## 🎯 优化建议

### 多阶段构建优化

Dockerfile 已使用多阶段构建：
- **deps**: 仅生产依赖
- **builder**: 构建应用
- **runtime**: 运行时（最小镜像）

预计镜像大小: < 150MB

### 健康检查

Dockerfile 已包含健康检查：
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', ...)"
```

### 安全措施

- ✅ 使用 Alpine Linux（最小化攻击面）
- ✅ 非 root 用户运行（nextjs:1001）
- ✅ 最小化层数
- ✅ 生产依赖分离

## 🌐 生产环境部署

### 使用 Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'
services:
  leverage-ai:
    build:
      context: .
      args:
        HUNYUAN_API_KEY: ${HUNYUAN_API_KEY}
        TCB_ENV_ID: ${TCB_ENV_ID}
        CLOUDBASE_SECRET_ID: ${CLOUDBASE_SECRET_ID}
        CLOUDBASE_SECRET_KEY: ${CLOUDBASE_SECRET_KEY}
        TENCENTCLOUD_SECRET_ID: ${TENCENTCLOUD_SECRET_ID}
        TENCENTCLOUD_SECRET_KEY: ${TENCENTCLOUD_SECRET_KEY}
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

运行：
```powershell
docker-compose up -d
docker-compose logs -f
docker-compose down
```

### 推送到镜像仓库

```powershell
# 标记镜像
docker tag leverage-ai your-registry.com/leverage-ai:latest

# 推送镜像
docker push your-registry.com/leverage-ai:latest
```

## 🐛 故障排查

### 问题 1: Docker Desktop 未运行

**错误**: `error during connect: ... dockerDesktopLinuxEngine`

**解决**:
1. 启动 Docker Desktop
2. 等待 Docker 完全启动（图标显示绿色）
3. 验证: `docker ps`

### 问题 2: 端口已被占用

**错误**: `Bind for 0.0.0.0:3000 failed: port is already allocated`

**解决**:
```powershell
# 方案 A: 使用其他端口
docker run -d -p 3001:3000 ...

# 方案 B: 停止占用端口的进程
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 问题 3: 构建失败

**解决**:
1. 检查 Dockerfile 语法
2. 确保 .dockerignore 正确配置
3. 清理 Docker 缓存: `docker builder prune`

### 问题 4: 容器无法访问

**检查步骤**:
```powershell
# 1. 容器是否运行
docker ps

# 2. 查看日志
docker logs leverage-ai-app

# 3. 检查端口映射
docker port leverage-ai-app

# 4. 测试容器内部
docker exec -it leverage-ai-app wget -O- http://localhost:3000
```

## 📊 性能监控

### 查看资源使用

```powershell
# 实时资源统计
docker stats leverage-ai-app

# CPU 和内存使用
docker stats --no-stream leverage-ai-app
```

### 限制资源

```powershell
docker run -d `
  -p 3000:3000 `
  --name leverage-ai-app `
  --memory="512m" `
  --cpus="1.0" `
  --env-file .env.local `
  leverage-ai
```

## ✅ 验证清单

部署完成后验证：

- [ ] 容器运行中: `docker ps | grep leverage-ai`
- [ ] 健康检查通过: `docker inspect leverage-ai-app | grep Health`
- [ ] 应用可访问: http://localhost:3000
- [ ] 测试页面正常: http://localhost:3000/test-functions
- [ ] 云函数调用正常
- [ ] 数据库连接正常
- [ ] 日志无错误: `docker logs leverage-ai-app`

## 🎉 完成！

容器化部署完成后，您的应用将：
- ✅ 在隔离的容器中运行
- ✅ 可以轻松迁移到任何支持 Docker 的环境
- ✅ 拥有一致的运行环境
- ✅ 支持水平扩展

---

**需要帮助？** 查看日志并提供错误信息以获得支持。
