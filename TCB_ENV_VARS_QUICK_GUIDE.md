# TCB Cloud Run 环境变量配置指南（简化版）

## 核心概念

✅ **所有环境变量都在 TCB Cloud Run 后台配置**  
✅ **程序部署后会自动读取这些变量**  
✅ **无需在代码中硬编码任何密钥**

---

## 配置步骤

### 1. 访问 TCB Cloud Run 控制台

https://console.cloud.tencent.com/tcb/run

### 2. 进入环境变量配置页面

1. 选择你的服务（如 `leverage-ai`）
2. 点击"配置" → "环境变量"
3. 添加以下环境变量

---

## 必需配置的环境变量

### 基础配置（必需）

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `NEXT_PUBLIC_TCB_ENV_ID` | `cloud1-7galmfiu70af91a6` | TCB 环境 ID |
| `TCB_ENV_ID` | `cloud1-7galmfiu70af91a6` | TCB 环境 ID（同上） |
| `TCB_SECRET_ID` | `AKID...` | 腾讯云 API 密钥 ID |
| `TCB_SECRET_KEY` | `xxx...` | 腾讯云 API 密钥 Key |
| `TENCENTCLOUD_SECRET_ID` | `AKID...` | 同 TCB_SECRET_ID |
| `TENCENTCLOUD_SECRET_KEY` | `xxx...` | 同 TCB_SECRET_KEY |
| `TENCENTCLOUD_REGION` | `ap-shanghai` | 腾讯云区域 |
| `JWT_SECRET` | `9f8c2a1e7d4b...` | JWT 签名密钥（64位随机字符串） |

### AI 服务配置（必需）

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `HUNYUAN_API_KEY` | `sk-xxx...` | 腾讯混元 AI API Key |
| `HUNYUAN_BASE_URL` | `https://api.hunyuan.cloud.tencent.com/v1` | Hunyuan API 地址 |
| `HUNYUAN_MODEL` | `hunyuan-lite` | 默认模型 |
| `AI_DEFAULT_AGENT` | `hunyuan` | 默认 AI 代理 |

### 应用配置（推荐）

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `production` | Node 环境 |
| `NEXT_PUBLIC_ENV` | `production` | 应用环境 |
| `NEXT_PUBLIC_USE_TCB_AUTH` | `true` | 使用 TCB 认证 |

### 可选配置

| 变量名 | 说明 |
|--------|------|
| `OPENAI_API_KEY` | OpenAI API（可选，可用 Hunyuan 替代） |
| `GEMINI_API_KEY` | Google Gemini（3D 图像生成） |
| `TRIPO3D_API_KEY` | Tripo3D（3D 模型生成） |
| `COS_BUCKET` | COS 存储桶名称 |
| `COS_REGION` | COS 区域 |
| `LITELLM_PROXY_URL` | LiteLLM 代理地址 |

---

## 构建参数配置（可选）

如果需要在**构建时**使用环境变量，在"构建配置"部分添加：

### 构建参数（Build Args）

| 参数名 | 值 |
|--------|-----|
| `NEXT_PUBLIC_TCB_ENV_ID` | `cloud1-7galmfiu70af91a6` |
| `NEXT_PUBLIC_ENV` | `production` |
| `NEXT_PUBLIC_USE_TCB_AUTH` | `true` |

**注意：** Dockerfile 已设置默认值，通常不需要手动配置构建参数。

---

## 快速配置清单

### ✅ 最小可运行配置（核心 8 个）

```bash
# TCB 基础
NEXT_PUBLIC_TCB_ENV_ID=cloud1-7galmfiu70af91a6
TCB_ENV_ID=cloud1-7galmfiu70af91a6
TCB_SECRET_ID=你的密钥ID
TCB_SECRET_KEY=你的密钥Key
TENCENTCLOUD_REGION=ap-shanghai

# 安全
JWT_SECRET=生成一个64位随机字符串

# AI
HUNYUAN_API_KEY=你的混元密钥
HUNYUAN_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1
```

### ✅ 推荐生产配置（核心 + 14 个）

上述 8 个 + 以下 6 个：

```bash
# 应用配置
NODE_ENV=production
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_USE_TCB_AUTH=true

# 完整腾讯云配置
TENCENTCLOUD_SECRET_ID=同TCB_SECRET_ID
TENCENTCLOUD_SECRET_KEY=同TCB_SECRET_KEY

# AI 配置
HUNYUAN_MODEL=hunyuan-lite
AI_DEFAULT_AGENT=hunyuan
```

---

## 如何获取密钥

### TCB 环境 ID
1. 访问 [TCB 控制台](https://console.cloud.tencent.com/tcb)
2. 选择你的环境
3. 在"概览"页面查看"环境 ID"

### 腾讯云 API 密钥
1. 访问 [API 密钥管理](https://console.cloud.tencent.com/cam/capi)
2. 点击"新建密钥"
3. 复制 `SecretId` 和 `SecretKey`

### Hunyuan API Key
1. 访问 [混元控制台](https://console.cloud.tencent.com/hunyuan)
2. 开通服务
3. 获取 API Key

### JWT Secret
使用以下命令生成：
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})

# 在线生成
https://generate-random.org/api-token-generator?count=1&length=64
```

---

## 验证配置

### 1. 检查环境变量是否生效

部署后，访问健康检查端点：
```bash
curl https://你的域名.com/api/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T...",
  "environment": "production",
  "tcb": {
    "configured": true,
    "envId": "cloud1-7galmfiu70af91a6"
  }
}
```

### 2. 查看应用日志

在 TCB Cloud Run 控制台：
1. 选择服务
2. 点击"日志"
3. 查找启动日志，确认环境变量已加载

---

## 常见问题

### Q: 配置了环境变量但程序读不到？
**A:** 
1. 检查变量名是否正确（区分大小写）
2. 重启服务使配置生效
3. 查看应用日志确认加载情况

### Q: 构建失败提示缺少环境变量？
**A:** 
- 确保 `NEXT_PUBLIC_TCB_ENV_ID` 已配置
- 或者在构建参数中添加（Dockerfile 已有默认值）

### Q: 需要重新部署才能生效吗？
**A:** 
- 修改环境变量后需要重启服务
- 不需要重新构建镜像

### Q: 多个环境（开发/测试/生产）如何管理？
**A:** 
- 为每个环境创建独立的 TCB Cloud Run 服务
- 每个服务配置对应环境的变量

---

## 安全建议

✅ **不要在代码中硬编码密钥**  
✅ **不要将 .env 文件提交到 Git**  
✅ **定期轮换密钥（建议每季度）**  
✅ **使用最小权限原则配置 API 密钥**  
✅ **开启 TCB 访问日志监控异常访问**

---

## 部署流程

```
1. GitHub 推送代码
   ↓
2. TCB Cloud Run 自动触发构建
   ↓
3. Docker 构建时使用默认值（或构建参数）
   ↓
4. 容器启动时读取环境变量
   ↓
5. 应用正常运行 ✅
```

---

## 相关文档

- [完整配置文档](./TCB_DEPLOYMENT_ENV_CONFIG.md)
- [部署准备报告](./DEPLOYMENT_READINESS_REPORT.md)
- [Dockerfile](./Dockerfile)

---

**最后更新:** 2025-11-12  
**版本:** v1.0
