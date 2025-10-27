# Leverage AI - Docker 部署指南

## 构建镜像

### 方式 1: 使用 npm 脚本（推荐）
```powershell
npm run docker:build
```

### 方式 2: 使用 PowerShell 脚本
```powershell
.\docker-build.ps1
```

### 方式 3: 手动构建
```powershell
docker build `
  --build-arg HUNYUAN_API_KEY=%HUNYUAN_API_KEY% `
  --build-arg CLOUDBASE_ENV_ID=%CLOUDBASE_ENV_ID% `
  -t leverage-ai:latest .
```

## 运行容器

### 使用 npm 脚本
```powershell
npm run docker:run
```

### 手动运行
```powershell
docker run --rm -p 3000:3000 --env-file .env.local leverage-ai:latest
```

## 健康检查

容器启动后访问：
- http://localhost:3000/api/health

## 优化说明

1. **多阶段构建**：deps → builder → runtime，最小化最终镜像
2. **层缓存优化**：package.json 单独复制，依赖变化时才重装
3. **生产依赖分离**：deps 阶段只安装生产依赖
4. **安全性**：非 root 用户运行（nextjs:nodejs）
5. **体积控制**：目标 <150MB（node:20-alpine 基础镜像约 40MB）

## 故障排查

### Docker Hub 拉取失败
如遇 `failed to fetch oauth token` 错误：
```powershell
# 配置镜像加速（阿里云示例）
# Docker Desktop > Settings > Docker Engine，添加：
{
  "registry-mirrors": ["https://xxx.mirror.aliyuncs.com"]
}
```

### 构建超时
```powershell
# 增加 Docker Desktop 内存限制
# Settings > Resources > Memory: 至少 4GB
```

### 端口占用
```powershell
# 查看占用
netstat -ano | findstr :3000

# 使用其他端口
docker run --rm -p 3006:3000 --env-file .env.local leverage-ai:latest
```

## 环境变量

在 `.env.local` 中配置：
```env
HUNYUAN_API_KEY=your_api_key
CLOUDBASE_ENV_ID=your_env_id
NEXT_PUBLIC_FIREBASE_API_KEY=...
# 其他必需的环境变量
```

## 镜像清理

```powershell
# 删除镜像
docker rmi leverage-ai:latest

# 清理构建缓存
docker builder prune
```
