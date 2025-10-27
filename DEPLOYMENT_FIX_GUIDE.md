# TCB 部署修复指南 - 静态资源 404 问题

## 问题分析

### 症状
生产环境（TCB）访问登录页时出现：
```
Application error: a client-side exception has occurred...
404 (Not Found): GET /_next/static/chunks/webpack-*.js
```

### 根本原因
Next.js `output: 'standalone'` 模式下，构建生成两个分离的目录：
- `.next/standalone/` - 服务器运行时（server.js, node_modules 等）
- `.next/static/` - 客户端静态资源（JavaScript, CSS 等）

**问题**：TCB 部署时只复制了 `.next/standalone`，没有复制 `.next/static/`，导致客户端无法加载 JavaScript 文件。

## 修复方案

### 1. 本地验证（已完成）✅

创建完整的部署目录结构：
```
.deploy/
├── .next/
│   ├── standalone/     (从 .next/standalone 复制)
│   └── static/         (从 .next/static 复制) ✅ 关键
├── node_modules/
├── public/
├── server.js
├── package.json
└── ...
```

**验证结果**：
- ✅ 本地测试服务器成功加载所有静态资源（HTTP 200）
- ✅ 客户端 JavaScript 文件正常加载

### 2. 创建正确的部署包

已生成 `leverage-deployment.zip` (30.11 MB)，包含：
- ✅ 完整的 `.next/` 目录（包括 static）
- ✅ 所有运行时依赖
- ✅ 公共文件

### 3. 重新部署到 TCB

#### 方式 A：通过 TCB 文件管理器手动上传（推荐新手）

1. 登录 TCB 控制台 → 你的应用
2. 进入 CloudBase 托管 → 文件管理
3. 删除旧的 `.next` 目录
4. 上传新的完整部署包
5. 重启应用

#### 方式 B：通过 Git 和自动部署（推荐已配置）

1. **检查你的部署配置**
   ```bash
   cat cloudbaserc.json
   ```

2. **更新根目录的部署包内容**
   
   确保你的 Git 仓库中包含：
   ```
   .deploy/                  # 包含所有部署文件
   ├── .next/
   │   ├── standalone/
   │   ├── static/           ← 关键文件
   │   └── public/
   ├── package.json
   ├── server.js
   └── ...
   ```

3. **推送到 GitHub**
   ```bash
   git add leverage-deployment.zip .deploy/
   git commit -m "fix: 修复静态资源 404 - 包含完整 .next/static"
   git push origin Leverage10220939
   ```

4. **TCB 自动部署**（如已配置）
   - TCB 应该检测到变更并自动触发部署
   - 等待部署完成（通常 2-5 分钟）

#### 方式 C：通过本地命令行部署（高级）

如果你已配置 TCB CLI：
```bash
cd .deploy
tcb login
tcb hosting:deploy -e leverage03  # 替换为你的环境 ID
```

## 部署检查清单

部署后访问你的应用，检查以下项目：

- [ ] 主页加载成功（无白屏或应用错误）
- [ ] 浏览器控制台无 404 错误
- [ ] 所有 `_next/static/chunks/*.js` 文件加载成功（状态码 200）
- [ ] 点击注册链接跳转正常
- [ ] 登录表单显示完整
- [ ] 短信发送功能工作正常

### 快速测试
在浏览器控制台运行：
```javascript
// 检查静态资源是否加载
fetch('/_next/static/chunks/webpack-*.js')
  .then(r => console.log('✅ 静态资源 OK', r.status))
  .catch(e => console.error('❌ 静态资源失败', e));
```

## 文件参考

| 文件 | 说明 |
|-----|-----|
| `leverage-deployment.zip` | 完整的生产部署包（30.11 MB） |
| `.deploy/` | 部署目录结构（用于本地测试和版本控制） |
| `.next/static/` | 静态资源文件夹（包含 chunks、chunks-hash 等） |
| `.next/standalone/` | 服务器运行时目录 |

## 常见问题

### Q: 为什么本地测试正常但生产还是 404？
**A**: 很可能 TCB 的缓存策略问题。尝试：
1. 清除浏览器缓存（Ctrl+Shift+Delete）
2. 使用隐身窗口访问
3. 在 TCB 控制台清除 CDN 缓存（如已启用）

### Q: 如何验证 TCB 上的文件是否正确？
**A**: 在 TCB 文件管理器中检查：
- ✅ `.next/static/` 目录存在
- ✅ `.next/static/chunks/` 包含 webpack-*.js 等文件

### Q: 能否减小部署包大小？
**A**: 可以移除以下文件来减小尺寸（不建议）：
- `.next/.cache/` (构建缓存)
- 某些特定的 node_modules 依赖

## 下一步

1. **立即行动**：重新上传完整的部署包到 TCB
2. **验证**：访问应用并检查上面的清单
3. **监控**：在生产环境中观察日志和错误

如有问题，请参考 [TCB 官方文档](https://cloud.tencent.com/document/product/876)

---
最后更新：2025-10-27
生成的部署包：`leverage-deployment.zip` (30.11 MB)
