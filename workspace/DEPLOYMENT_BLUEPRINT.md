# **项目发布与部署指南 (Firebase Studio)**

**版本**: 1.1
**日期**: 2025年9月30日
**目的**: 本文档为基于 Next.js、Firebase 和 Genkit 的全栈 AI 应用，提供一个通过 Firebase Studio 进行发布和部署的详细技术参考。

---

## **1. 核心技术栈与版本**

为确保环境一致性，以下是本项目的核心技术栈及其在稳定版本 `2.5 (Final)` 中锁定的版本号：

| 技术/库         | 版本        | 备注                               |
| :---------------- | :---------- | :--------------------------------- |
| **Next.js**       | `15.3.3`    | 全栈应用框架 (App Router)            |
| **React**         | `18.3.1`    | UI 库                              |
| **TypeScript**    | `5.x`       | 强类型语言                         |
| **Firebase SDK**  | `11.9.1`    | 后端即服务 (Auth, Firestore)       |
| **Genkit**        | `1.14.1`    | Google AI 流程开发工具包         |
| **ShadCN UI**     | `N/A`       | UI 组件库 (基于 Radix UI)          |
| **Tailwind CSS**  | `3.4.1`     | CSS 框架                           |

---

## **2. 部署概述**

本项目利用 **Firebase App Hosting** 实现了一键式、自动化的部署流程。其核心理念是：**代码即架构，推送即部署**。

在 Firebase Studio 这个集成开发环境中，您的代码仓库与一个特定的 Firebase 项目直接关联。当您批准并合并代码变更时，Firebase App Hosting 会自动被触发，执行以下操作：

1.  **构建 (Build)**: 拉取最新代码，在云端环境中执行 `npm run build`，生成一个独立的、可运行的 Next.js 应用。
2.  **部署 (Deploy)**: 将构建产物部署到一个可公开访问的 Web 服务上。
3.  **路由 (Route)**: 自动配置全球 CDN，将流量路由到您的应用实例。

您无需手动操作服务器或配置复杂的 CI/CD 流水线，整个过程由 Firebase Studio 和 App Hosting 自动完成。

---

## **3. 关键配置文件解析**

### **3.1. `apphosting.yaml` - 后端服务配置**

这是 Firebase App Hosting 的核心配置文件，它定义了您后端服务的运行环境。

```yaml
# Settings to manage and configure a Firebase App Hosting backend.
runConfig:
  # 自动扩缩容的最大实例数
  maxInstances: 1
# 可以在此添加 cpu, memoryMiB 等配置
# cpu: 1
# memoryMiB: 512
```

-   **`maxInstances`**: 控制您的应用可以自动扩展的最大实例数量。对于初创项目或演示，`1` 或 `2` 是一个合理的起点。

### **3.2. `next.config.ts` - Next.js 构建配置**

为了确保 Next.js 应用能正确地被 App Hosting 打包和部署，需要确保以下配置（本项目已默认配置好）：

-   **独立输出 (`output: 'standalone'`)**: 这是与 App Hosting 兼容的关键。它会把所有必要的依赖项（包括 `node_modules` 的一部分）都复制到构建输出目录中，创建一个可以独立运行的文件夹。
-   **环境变量**: 正确配置 `serverRuntimeConfig` 和 `publicRuntimeConfig` 以区分服务端和客户端可用的环境变量。

### **3.3. 环境变量与密钥管理**

-   **`.env` 文件**: 此文件**仅用于本地开发**，**不应**包含任何生产环境的敏感密钥，且**不应**提交到代码仓库。
-   **生产环境密钥 (核心)**: 对于如 `FIREBASE_SERVICE_ACCOUNT_KEY` 这样的服务账户密钥，必须通过 **Google Cloud Secret Manager** 进行管理。
    1.  在 Google Cloud控制台 -> Secret Manager 中创建一个新的 Secret。
    2.  将您的服务账户JSON密钥内容作为 Secret 的值。
    3.  在 Firebase App Hosting 的设置中，将这个 Secret 关联到您的后端服务，并映射为名为 `FIREBASE_SERVICE_ACCOUNT_KEY` 的环境变量。
    4.  这样，在云端运行时，App Hosting 会自动从 Secret Manager 中安全地读取密钥并注入到您的应用环境中。

### **3.4. HTTP 缓存头优化 (新增)**
为了充分利用 Firebase 的全球 CDN，我们在 `next.config.ts` 中添加了全局的 `Cache-Control` 头：
```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=300, s-maxage=600',
        },
      ],
    },
  ]
},
```
- **`max-age=300`**: 浏览器缓存5分钟。
- **`s-maxage=600`**: CDN 缓存10分钟。
这能显著减少回源请求，提升性能并降低成本。

---

## **4. 后端服务与规则的自动部署**

### **4.1. Firestore 安全规则**

-   **文件**: `firestore.rules`
-   **触发机制**: 当 Firebase Studio 检测到此文件的任何变更（即使只是一个空格或注释），文件监视系统会自动将新的规则集部署到与本项目关联的 Firestore 数据库上。
-   **最佳实践**: 在修改规则后，通过应用内的实际操作来验证规则是否按预期工作，特别是对于读写权限的限制。

### **4.2. Genkit AI 流程**

-   **文件**: 位于 `src/ai/flows/` 目录下的所有 `*.ts` 文件。
-   **部署方式**: Genkit 的 AI 流程被编写为标准的 TypeScript/JavaScript 模块，它们是 Next.js 应用的一部分。当 `next build` 执行时，这些流程会被一同打包进最终的应用服务中。
-   **调用**: 前端通过调用这些已部署在后端服务上的流程，来实现AI功能。

---

## **5. 标准发布流程 (Step-by-Step)**

1.  **最终代码审查**:
    *   在 Firebase Studio 中，仔细检查所有待提交的文件变更。
    *   确认所有新功能都已完成，且没有遗留的调试代码（如 `console.log`）。

2.  **确认环境变量**:
    *   检查 `next.config.ts`，确保所有需要的生产环境变量（如 `FIREBASE_SERVICE_ACCOUNT_KEY`）都已在 `serverRuntimeConfig` 或 `publicRuntimeConfig` 中声明。
    *   **关键**: 登录 Google Cloud 控制台，确认 Secret Manager 中对应的 Secret 已创建并包含正确的值。

3.  **触发部署**:
    *   在 Firebase Studio 中，**批准并合并**您的代码变更。
    *   提交操作会自动触发 Firebase App Hosting 的新一轮构建和部署。

4.  **监控部署状态**:
    *   在 Firebase 控制台的 "App Hosting" 部分，您可以看到实时的部署日志。
    *   通常，部署过程会持续几分钟。您可以观察到 "Building..." -> "Deploying..." -> "Live" 的状态变化。

5.  **验证线上服务**:
    *   部署成功后，访问 Firebase App Hosting 提供的默认域名（`https://<your-app-name>--<project-hash>-<region>.web.app`）。
    *   系统性地测试所有核心功能：
        *   用户注册、登录、登出。
        *   AI 购物助手的主要交互。
        *   需求池的发布与查看。
        *   创意者工作台的核心功能。
        *   后台管理页面的数据加载与操作。
    *   打开浏览器开发者工具，检查控制台是否有错误信息。

6.  **域名绑定 (可选)**:
    *   在 Firebase 控制台的 "App Hosting" -> "Domains" 中，您可以添加自定义域名，并按照指引完成 DNS 配置。

---
**文档结束**
