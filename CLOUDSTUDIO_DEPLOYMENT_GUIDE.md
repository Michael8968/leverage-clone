# 🚀 腾讯云开发平台 (CloudStudio) 部署指南

**文档版本**: 1.0  
**创建时间**: 2025年1月  
**项目状态**: ✅ 生产就绪

---

## 📋 部署前准备清单

### ✅ 代码准备
- [x] Firebase → TCB 迁移完成
- [x] TypeScript 检查: 0 个错误
- [x] 生产构建: 成功 (41 页)
- [x] 所有依赖已安装
- [x] 环境配置文件已准备

### ✅ GitHub 仓库准备
- [x] 代码已提交至 `Leverage10220939` 分支
- [x] 远程分支已同步
- [x] `.gitignore` 已正确配置
- [ ] GitHub 访问令牌已准备 (待执行)

### ✅ 腾讯云配置准备
- [x] TCB 环境 ID 已获取
- [x] 腾讯云 Secret ID/Key 已获取
- [x] Hunyuan API Key 已配置
- [ ] CloudStudio 账户已激活 (待验证)

### ✅ 环境变量配置
- [x] `.env` 文件已准备
- [x] TCB 相关变量已配置
- [x] Hunyuan API 配置已准备
- [x] 降级方案 (Firebase) 已配置

---

## 🔐 环境变量配置

### 必需的环境变量

```bash
# 腾讯云 CloudBase (TCB) 配置
CLOUDBASE_ENV_ID=your_env_id
CLOUDBASE_SECRET_ID=your_secret_id
CLOUDBASE_SECRET_KEY=your_secret_key

# 腾讯云混元 API 配置
HUNYUAN_API_KEY=your_hunyuan_api_key
HUNYUAN_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1

# Firebase 配置 (降级用)
FIREBASE_SERVICE_ACCOUNT_KEY=your_firebase_service_account
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_bucket

# 可选: 其他配置
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your_domain.com
```

### 如何获取腾讯云凭证

#### 1. 获取 CLOUDBASE_ENV_ID
```bash
# 在腾讯云控制台获取
# 路径: 云开发 > 环境
# 复制环境 ID (如: release-1234abcd)
```

#### 2. 获取 CLOUDBASE_SECRET_ID 和 SECRET_KEY
```bash
# 路径: 腾讯云控制台 > 访问管理 > API 密钥
# 创建新的 API 密钥或使用现有密钥
# 确保该密钥有 CloudBase 的访问权限
```

#### 3. 获取 HUNYUAN_API_KEY
```bash
# 路径: 腾讯云控制台 > 混元大模型 > API 密钥
# 创建新的 API 密钥
# 记录密钥内容
```

---

## 📤 GitHub 推送步骤

### 第 1 步：验证当前状态

```bash
cd c:\Users\13916\Leverage\leverage-clone

# 检查 git 状态
git status

# 预期输出:
# On branch Leverage10220939
# Your branch is ahead of 'origin/Leverage10220913' by 7 commits.
# nothing to commit, working tree clean
```

### 第 2 步：推送代码至 GitHub

```bash
# 推送当前分支
git push origin Leverage10220939

# 或推送所有分支
git push origin --all
```

### 第 3 步：验证推送成功

```bash
# 查看远程分支
git branch -r

# 预期输出包含:
# origin/Leverage10220939
```

---

## 🌐 CloudStudio 部署步骤

### 第 1 步：登录 CloudStudio

1. 访问 https://cloudstudio.net/
2. 使用腾讯云账户登录
3. 选择或创建工作区

### 第 2 步：导入 GitHub 项目

#### 方法 A: 直接链接 GitHub
1. 点击 "New Project" 或 "导入项目"
2. 选择 "GitHub"
3. 连接 GitHub 账户 (首次需要授权)
4. 选择仓库: `Angus1976/leverage-clone`
5. 选择分支: `Leverage10220939`
6. 点击 "导入"

#### 方法 B: 使用 Git URL
1. 复制 Git URL:
   ```
   https://github.com/Angus1976/leverage-clone.git
   ```
2. 在 CloudStudio 中选择 "Clone from Git"
3. 粘贴 URL
4. 选择分支: `Leverage10220939`

### 第 3 步：配置环境变量

1. 在 CloudStudio 项目设置中，找到 "Environment Variables"
2. 添加以下变量:

```bash
CLOUDBASE_ENV_ID=your_env_id
CLOUDBASE_SECRET_ID=your_secret_id
CLOUDBASE_SECRET_KEY=your_secret_key
HUNYUAN_API_KEY=your_hunyuan_api_key
HUNYUAN_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1
FIREBASE_SERVICE_ACCOUNT_KEY=your_firebase_key (可选)
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket (可选)
NODE_ENV=production
```

**⚠️ 重要**: 确保所有敏感信息都在环境变量中，不要在代码中硬编码

### 第 4 步：安装依赖

在 CloudStudio 终端中执行:

```bash
# 清理旧依赖
npm run clean-deps

# 安装依赖
npm install

# 验证类型
npm run typecheck
```

### 第 5 步：构建应用

```bash
# 生产构建
npm run build

# 输出位置: .next/standalone/
```

### 第 6 步：启动应用

```bash
# 启动开发服务器 (测试)
npm run dev

# 或启动独立生产服务器
npm run start:standalone
```

---

## 🐳 Docker 部署 (可选)

如果 CloudStudio 不直接支持 Node.js，可以使用 Docker:

### 第 1 步：构建 Docker 镜像

```bash
npm run docker:build

# 或手动构建
docker build -t leverage-ai --build-arg HUNYUAN_API_KEY --build-arg CLOUDBASE_ENV_ID .
```

### 第 2 步：运行 Docker 容器

```bash
npm run docker:run

# 或手动运行
docker run --rm -p 3000:3000 --env-file .env.local leverage-ai
```

### 第 3 步：验证容器

```bash
# 检查容器是否运行
docker ps

# 查看日志
docker logs <container_id>

# 测试应用
curl http://localhost:3000
```

---

## ✅ 部署验证清单

### 构建验证
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 成功
- [ ] 无编译错误
- [ ] `.next/standalone` 目录已生成

### 环境变量验证
- [ ] CLOUDBASE_ENV_ID 已配置
- [ ] CLOUDBASE_SECRET_ID 已配置
- [ ] CLOUDBASE_SECRET_KEY 已配置
- [ ] HUNYUAN_API_KEY 已配置

### 应用启动验证
- [ ] `npm run dev` 成功启动
- [ ] 能够访问 http://localhost:3000
- [ ] 登录页面能够加载
- [ ] 没有控制台错误

### 功能验证
- [ ] 用户登录成功
- [ ] 数据库连接正常 (TCB)
- [ ] 存储服务正常
- [ ] AI 功能可用
- [ ] 页面导航正常

### 生产验证
- [ ] 使用 TCB 生产环境凭证
- [ ] 禁用调试模式
- [ ] 启用错误日志收集
- [ ] 配置监控告警
- [ ] 准备回滚方案

---

## 🔧 CloudStudio 特殊配置

### Node.js 版本
```bash
# CloudStudio 默认 Node.js 版本
# 确保支持 ES2017+
node --version  # 应该 >= 18.x
```

### 内存限制
```bash
# 如果构建内存不足，增加 Node.js 堆
NODE_OPTIONS=--max-old-space-size=8192 npm run build
```

### 超时配置
```bash
# 在 package.json scripts 中
"build": "NODE_OPTIONS=--max-old-space-size=8192 next build"
```

---

## 🆘 故障排查

### 问题 1: 无法连接 GitHub
**解决方案**:
1. 验证 GitHub 账户授权
2. 检查访问令牌是否过期
3. 重新授权 CloudStudio

### 问题 2: 依赖安装失败
**解决方案**:
```bash
# 清除缓存
npm cache clean --force

# 重新安装
npm install --legacy-peer-deps
```

### 问题 3: 构建超时
**解决方案**:
```bash
# 增加堆大小
NODE_OPTIONS=--max-old-space-size=8192 npm run build

# 或增加超时时间 (CloudStudio 设置)
```

### 问题 4: TCB 连接失败
**解决方案**:
1. 验证环境变量
2. 检查 TCB 环境状态
3. 确认 IP 不被限制
4. 查看 CloudStudio 日志

### 问题 5: Hunyuan API 调用失败
**解决方案**:
1. 验证 API Key
2. 检查 API 余额
3. 验证请求格式
4. 查看 API 文档

---

## 📊 部署后监控

### 日志查看
```bash
# 在 CloudStudio 中查看实时日志
tail -f .pm2/logs/app.log

# 或查看构建日志
tail -f .pm2/logs/build.log
```

### 性能指标
- 响应时间
- 数据库查询时间
- API 调用成功率
- 错误率

### 告警配置
- TCB 连接失败
- API 调用失败
- 内存使用过高
- CPU 使用过高

---

## 🚀 上线后步骤

### 第 1 步: 域名配置
```bash
# 配置自定义域名
# 在 CloudStudio 项目设置中:
# 项目 > 域名 > 添加自定义域名
```

### 第 2 步: SSL 证书
```bash
# CloudStudio 自动配置 HTTPS
# 或上传自定义证书
```

### 第 3 步: CDN 配置 (可选)
```bash
# 配置腾讯云 CDN
# 提升静态资源加载速度
```

### 第 4 步: 监控告警
```bash
# 配置监控面板
# 设置关键指标告警
# 配置日志采集
```

---

## 📞 参考资源

### 腾讯云文档
- [CloudStudio 文档](https://cloudstudio.net/docs/)
- [CloudBase 文档](https://cloud.tencent.com/document/product/876)
- [混元大模型 API](https://cloud.tencent.com/document/product/1804)

### 项目文档
- `VERIFICATION_REPORT.md` - 完整迁移验证
- `MIGRATION_EXECUTIVE_SUMMARY.md` - 迁移执行摘要
- `FIRESTORE_TO_TCB_MIGRATION_GUIDE.md` - TCB 迁移指南
- `MIGRATION_QUICK_START.md` - 快速开始指南

### 常用命令速查
```bash
# 开发
npm run dev

# 测试
npm run typecheck

# 构建
npm run build

# 数据迁移
npm run migrate:export
npm run migrate:import
npm run migrate:verify

# Docker
npm run docker:build
npm run docker:run
```

---

## ✨ 部署成功标志

```
✅ 应用成功启动
✅ 能够访问 https://your_domain.com
✅ 用户能够登录
✅ 数据库连接正常
✅ AI 功能可用
✅ 监控告警配置
✅ 性能指标良好

🎉 生产环境已就绪！
```

---

**最后更新**: 2025年1月  
**版本**: 1.0  
**状态**: ✅ 准备部署
