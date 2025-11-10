# 📋 部署快速参考

## 🎯 核心信息

| 项目 | 信息 |
|------|------|
| **项目名称** | AI 智能匹配与创意生成平台 (Leverage) |
| **部署环境** | 腾讯云 CloudBase 云托管 |
| **部署日期** | 2025-11-10/11 |
| **部署状态** | ✅ 生产环境运行中 |
| **GitHub 仓库** | https://github.com/Angus1976/leverage-clone |
| **部署分支** | `tcb-cloudrun-fullstack-ready` |

## 🔗 访问地址

```
生产环境: [配置您的域名]
健康检查: https://[your-domain]/api/health
管理后台: https://[your-domain]/admin-dashboard
```

## 📦 镜像信息

```
Registry: ccr.ccs.tencentyun.com
Namespace: tcb-100011340160-hcwe
Repository: ca-qrxboqpw_leverage
Latest Tag: leverage-005-20251110233400
Image Size: 231MB
```

## ⚙️ 关键配置

### 容器配置
```yaml
Port: 3000
CPU: 0.5 Core
Memory: 1GB
User: nextjs:1001
```

### 健康检查
```yaml
Path: /api/health
Port: 3000
Readiness Initial Delay: 10s
Liveness Initial Delay: 30s
```

### 必需环境变量
```bash
NODE_ENV=production
NEXT_PUBLIC_ENV=production
PORT=3000
TCB_ENV_ID=cloud1-7galmfiu70af91a6
HUNYUAN_API_KEY=<secret>
JWT_SECRET=<secret>
```

## 🚀 快速部署

```bash
# 1. 推送代码
git push origin tcb-cloudrun-fullstack-ready

# 2. TCB 自动构建和部署（约 3-5 分钟）

# 3. 验证
curl https://[your-domain]/api/health
```

## 🔧 常用命令

### 本地测试
```bash
npm run dev          # 开发模式
npm run build        # 生产构建
npm run start        # 生产启动
```

### Docker 操作
```bash
docker build -t leverage-app .
docker run -p 3000:3000 --env-file .env leverage-app
```

### 健康检查
```bash
curl http://localhost:3000/api/health
```

## 📚 完整文档

| 文档 | 说明 |
|------|------|
| [PRODUCTION_DEPLOYMENT_SUCCESS.md](./PRODUCTION_DEPLOYMENT_SUCCESS.md) | 详细部署记录 |
| [TCB_DEPLOYMENT_SOLUTION.md](./TCB_DEPLOYMENT_SOLUTION.md) | 完整部署方案 |
| [TCB_HEALTH_CHECK_FIX.md](./TCB_HEALTH_CHECK_FIX.md) | 健康检查配置 |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | 通用部署指南 |
| [README.md](./README.md) | 项目概览 |

## 🆘 快速故障排查

### Pod 无法启动
1. 检查环境变量是否完整
2. 查看 Pod 日志确认错误
3. 验证镜像是否可用

### 健康检查失败
1. 确认端口配置为 3000
2. 检查初始延迟设置（10s/30s）
3. 测试 /api/health 端点

### 数据库连接失败
1. 验证 TCB_ENV_ID 配置
2. 检查 TCB 密钥是否正确
3. 确认网络策略允许访问

## 📞 支持

- **腾讯云工单**: https://console.cloud.tencent.com/workorder
- **CloudBase 文档**: https://docs.cloudbase.net/
- **项目 Issues**: https://github.com/Angus1976/leverage-clone/issues

---

**最后更新**: 2025-11-11  
**文档版本**: v1.0
