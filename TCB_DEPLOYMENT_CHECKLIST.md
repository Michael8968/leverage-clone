# TCB 部署验收清单 - 5分钟快速验证

## ⚡ 快速检查（部署后立即执行）

### 1️⃣ 访问应用
```
URL: https://leverage03-194704-4-1382937545.sh.run.tcloudbase.com/
预期: 页面加载，显示登录或首页
不应该: 白屏、"Application error" 或 404
```

### 2️⃣ 打开浏览器开发者工具 (F12)
进入 **Console** 标签，查看错误：

**✅ 正常（允许）**
- 无 404 错误
- 无红色 JavaScript 错误
- 可能有黄色警告（忽略）

**❌ 不正常（需修复）**
```
❌ GET /_next/static/chunks/webpack-*.js 404
❌ GET /_next/static/chunks/main-app-*.js 404
❌ TypeError: Cannot read property...（应用崩溃）
```

### 3️⃣ 快速功能检查

在浏览器控制台执行：
```javascript
// 检查页面是否正确加载
console.log('📍 当前 URL:', window.location.href);
console.log('📍 页面标题:', document.title);
console.log('📍 HTML 长度:', document.documentElement.outerHTML.length);
```

**预期输出**
```
📍 当前 URL: https://leverage03-194704-4-1382937545.sh.run.tcloudbase.com/
📍 页面标题: Leverage (或你的应用名称)
📍 HTML 长度: 3000+ (不应该是 <500 的错误页面)
```

---

## 📊 验收标准

### ✅ 通过条件（以下全部满足）
- [ ] 页面加载无错误（非白屏、非 "Application error"）
- [ ] 浏览器控制台无 404 错误
- [ ] 浏览器控制台无红色 JavaScript 错误
- [ ] 页面能显示登录表单或首页内容
- [ ] 点击按钮有反应（不卡顿）

### ⚠️ 需要修复（如果任何一项失败）
- [ ] 仍然看到 404 错误 → 检查 TCB 文件是否正确上传 `.next/static`
- [ ] 仍然显示 "Application error" → 检查环境变量和应用配置
- [ ] 页面加载很慢 → 等待 1-2 分钟（应用首次启动可能慢）

---

## 🔍 详细故障排查

如果上述快速检查失败，按步骤排查：

### 第 1 步：检查 TCB 文件
登录 TCB 控制台 → 文件管理，验证：
```
必须存在：
  /.next/static/            ← 最关键！
  /.next/static/chunks/
  /server.js
  /package.json
```

### 第 2 步：检查应用日志
TCB 控制台通常有日志输出，查看是否有错误信息

### 第 3 步：本地测试
在本地测试是否正常：
```bash
cd .deploy
node server.js
# 访问 http://localhost:3000
```

---

## 📋 如果一切正常，接下来测试功能

### 测试流程
1. **访问注册页** → `/register-phone`
   - [ ] 表单显示正常
   - [ ] 可以输入手机号

2. **点击获取验证码**
   - [ ] 能收到短信
   - [ ] 验证码有效

3. **输入验证码并注册**
   - [ ] 注册成功
   - [ ] 重定向到登录页

4. **登录**
   - [ ] 输入手机号和密码
   - [ ] 登录成功
   - [ ] 进入首页

5. **访问管理员页面** (需管理员权限)
   - [ ] 访问 `/admin-manager`
   - [ ] 显示管理员列表

---

## 💾 记录部署信息

请保存以下信息用于后续参考：

```
部署时间: ________________
部署包: leverage-deployment-fixed.zip
部署位置: TCB (leverage03)
验证通过: [ ] 是 [ ] 否
问题记录: ________________________________
```

---

**如果所有检查都通过 ✅，部署就成功了！**

下一步可选：
- 收集生产日志以供分析
- 进行完整的端到端测试
- 文档化部署流程
