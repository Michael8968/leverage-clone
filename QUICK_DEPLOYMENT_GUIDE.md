# ⚡ 快速上线操作指南 (5-10分钟速查)

**版本**: 1.0  
**用时**: 5-10 分钟 (不含等待时间)

---

## 🚀 一键推送和部署

### 第一步：推送代码至 GitHub (2-3 分钟)

```powershell
# 打开 PowerShell，进入项目目录
cd c:\Users\13916\Leverage\leverage-clone

# 查看状态 (应该是 clean)
git status

# 推送到 GitHub
git push origin Leverage10220939

# 验证 (访问网页)
# https://github.com/Angus1976/leverage-clone/branches
# 查看 Leverage10220939 分支是否是最新的
```

**预期输出**:
```
Enumerating objects: ...
Counting objects: 100% (...)
Writing objects: 100% (...)
To github.com:Angus1976/leverage-clone.git
   6942b57..25c938b  Leverage10220939 -> Leverage10220939
```

### 第二步：在 CloudStudio 中部署 (5-7 分钟)

#### 2.1 访问并登录
```
访问: https://cloudstudio.net/
登录: 使用腾讯云账户
```

#### 2.2 导入项目 (2 分钟)
```
点击: "New Project" 或 "Import"
选择: "GitHub"
授权: GitHub 账户 (首次需要)
选择仓库: Angus1976/leverage-clone
选择分支: Leverage10220939
点击: "Import"
```

#### 2.3 配置环境变量 (1 分钟)

在项目设置中找到 "Environment Variables" 或编辑 `.env` 文件:

```env
CLOUDBASE_ENV_ID=your_env_id_here
CLOUDBASE_SECRET_ID=your_secret_id_here
CLOUDBASE_SECRET_KEY=your_secret_key_here
HUNYUAN_API_KEY=your_hunyuan_key_here
HUNYUAN_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1
NODE_ENV=production
```

#### 2.4 构建和启动 (3-4 分钟)

在 CloudStudio 终端中:

```bash
# 安装依赖 (首次)
npm install

# 构建
npm run build

# 启动 (选择一种)
npm run dev              # 开发模式 (测试)
npm run start:standalone # 生产模式
```

#### 2.5 验证成功
```
✅ 应用已启动
✅ 能够访问 http://localhost:3000
✅ 页面加载成功
```

---

## 📋 快速参考表

### 关键命令速查

| 任务 | 命令 | 用时 |
|------|------|------|
| 推送代码 | `git push origin Leverage10220939` | 2-3 分钟 |
| 安装依赖 | `npm install` | 3-5 分钟 |
| 检查错误 | `npm run typecheck` | 1 分钟 |
| 构建应用 | `npm run build` | 3-5 分钟 |
| 启动开发 | `npm run dev` | <1 分钟 |
| 启动生产 | `npm run start:standalone` | <1 分钟 |
| 导出数据 | `npm run migrate:export` | 2-5 分钟 |

### 环境变量快速查找

| 变量 | 获取位置 | 说明 |
|------|---------|------|
| CLOUDBASE_ENV_ID | 腾讯云 > 云开发 > 环境 | 环境 ID (必需) |
| CLOUDBASE_SECRET_ID | 腾讯云 > 访问管理 > API 密钥 | Secret ID (必需) |
| CLOUDBASE_SECRET_KEY | 腾讯云 > 访问管理 > API 密钥 | Secret Key (必需) |
| HUNYUAN_API_KEY | 腾讯云 > 混元 > API 密钥 | 混元 API Key (必需) |

---

## 🆘 常见问题解决 (30 秒速解)

### Q1: git push 报错 "Permission denied"
**A**: 使用 HTTPS 而不是 SSH，或确保 SSH 密钥已配置
```bash
# 如果使用 SSH 失败，改为 HTTPS
git remote set-url origin https://github.com/Angus1976/leverage-clone.git
git push origin Leverage10220939
```

### Q2: npm install 超时
**A**: 增加超时时间或使用镜像源
```bash
npm install --registry https://registry.npm.taobao.org
```

### Q3: npm run build 失败
**A**: 清除缓存后重试
```bash
npm cache clean --force
npm install
npm run typecheck
npm run build
```

### Q4: 无法连接 TCB
**A**: 检查环境变量是否正确配置
```bash
# 验证环境变量
echo $CLOUDBASE_ENV_ID
echo $CLOUDBASE_SECRET_ID

# 不应该为空
```

### Q5: 应用启动后无法访问
**A**: 检查端口是否正确
```bash
# 开发模式: http://localhost:3000
# 检查防火墙是否允许 3000 端口
```

---

## 📊 部署状态确认

### 部署前 ✅
```
✅ 代码推送至 GitHub
✅ TypeScript 检查: 0 个错误
✅ 生产构建: 成功 (41 页)
✅ 环境变量已准备
✅ TCB 环境已创建
```

### 部署中 ⏳
```
⏳ CloudStudio 导入代码 (2-3 分钟)
⏳ 安装依赖 (3-5 分钟)
⏳ 执行构建 (3-5 分钟)
⏳ 启动应用 (<1 分钟)
```

### 部署后 🎉
```
✅ 应用已启动
✅ 页面可访问
✅ 登录功能正常
✅ 数据库连接成功
✅ 所有功能可用
✅ 监控已配置
```

---

## 🎯 决策树

```
开始部署
  ↓
代码已推送至 GitHub?
  ├─ NO → 执行 "git push origin Leverage10220939"
  └─ YES ↓
    
CloudStudio 账户已激活?
  ├─ NO → 注册并激活账户
  └─ YES ↓
    
项目已导入?
  ├─ NO → 在 CloudStudio 导入 GitHub 项目
  └─ YES ↓
    
环境变量已配置?
  ├─ NO → 配置所有必需的环境变量
  └─ YES ↓
    
构建已成功?
  ├─ NO → 查看日志，修复错误
  └─ YES ↓
    
应用已启动?
  ├─ NO → 查看启动日志
  └─ YES ↓
    
✅ 部署完成！
   访问应用：https://your_domain.com
```

---

## 📱 移动查看版本

### 简化步骤
1. **推送**: `git push origin Leverage10220939` ✅
2. **导入**: CloudStudio 导入 GitHub 项目 ✅
3. **配置**: 添加环境变量 ✅
4. **构建**: `npm run build` ✅
5. **启动**: `npm run dev` 或 `npm run start:standalone` ✅

### 验证清单
- [ ] GitHub 推送成功
- [ ] CloudStudio 导入成功
- [ ] 环境变量配置完成
- [ ] 构建完成
- [ ] 应用启动成功
- [ ] 页面能够访问

---

## ⏱️ 时间预估

| 步骤 | 时间 | 备注 |
|------|------|------|
| Git 推送 | 2-3 分钟 | 取决于网络 |
| CloudStudio 导入 | 1-2 分钟 | 取决于项目大小 |
| 依赖安装 | 3-5 分钟 | 首次较长 |
| 构建应用 | 3-5 分钟 | 取决于系统 |
| 启动应用 | <1 分钟 | 通常很快 |
| **总计** | **12-16 分钟** | **不含等待时间** |

---

## 🎉 成功标志

部署完成时：

```
┌─────────────────────────────────────┐
│                                     │
│  ✅ 应用已启动                      │
│  ✅ 可以访问 http://localhost:3000 │
│  ✅ 页面加载成功                    │
│  ✅ 无控制台错误                    │
│  ✅ 数据库连接正常                  │
│                                     │
│  🎊 恭喜！部署成功！                │
│                                     │
└─────────────────────────────────────┘
```

---

## 📞 需要帮助？

### 快速链接
- 📖 详细部署指南: [CLOUDSTUDIO_DEPLOYMENT_GUIDE.md](./CLOUDSTUDIO_DEPLOYMENT_GUIDE.md)
- 📋 完整检查表: [GITHUB_PUSH_DEPLOYMENT_CHECKLIST.md](./GITHUB_PUSH_DEPLOYMENT_CHECKLIST.md)
- 🔍 迁移验证: [VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md)
- 🚀 快速开始: [MIGRATION_QUICK_START.md](./MIGRATION_QUICK_START.md)

### 联系方式
- CloudStudio 帮助: https://cloudstudio.net/help/
- 腾讯云支持: https://cloud.tencent.com/support/

---

**准备好了吗？** 👉 [开始部署](./CLOUDSTUDIO_DEPLOYMENT_GUIDE.md)

---

**最后更新**: 2025年1月  
**版本**: 1.0  
**难度**: ⭐ (很简单)  
**预计用时**: 5-10 分钟
