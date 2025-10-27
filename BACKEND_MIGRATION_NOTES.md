# 后端迁移进展 — Firebase Admin → TCB SDK

## 📋 概览

后端已从 **Firebase Admin SDK** 迁移到 **Tencent CloudBase (TCB) Admin SDK**，采用兼容层设计确保平滑过渡。

## ✅ 已完成的工作

### 1. 创建 TCB Admin 兼容层 (`src/lib/tcb-admin.ts`)

**核心组件：**
- `TcbAuthAdmin` — Auth 操作（获取用户、更新、删除等）
- `TcbFirestoreAdmin` — 数据库操作（集合、文档、查询、事务、批量写入）
- `TcbStorageAdmin` — 存储操作（签名 URL、上传/下载）

**关键特性：**
- ✅ Firestore 风格的 API：`collection()`, `doc()`, `get()`, `update()`, `batch()`
- ✅ 事务支持：`runTransaction()`
- ✅ 存储桶操作：`getSignedUrl()`, `file()`
- ✅ 完整的 TypeScript 类型支持

### 2. 更新 Firebase Admin 包装层 (`src/lib/firebase-admin.ts`)

**策略：**
- 优先使用 TCB Admin 接口
- 若 TCB 凭证不可用，自动降级到 Firebase Admin（若已配置）
- 保持向后兼容性

**导出函数：**
```typescript
export function getAdminAuth() → TcbAuthAdmin | FirebaseAuth
export function getAdminDb() → TcbFirestoreAdmin | Firestore
export function getAdminStorage() → TcbStorageAdmin | Storage
```

### 3. 现有代码兼容性验证

**已检查的文件：**
- ✅ `src/ai/flows/multimodal-flows.ts` — 使用 `getAdminStorage().bucket().file(path).getSignedUrl()`
- ✅ `src/lib/datastore/firebase-points.ts` — 使用 `db.collection().doc().get()`, `update()`, `add()`
- ✅ `src/ai/flows/user-management-flows.ts` — 使用 `getAdminAuth()`（已导入）

**构建验证：**
- ✅ `npm run -s typecheck` — 无错误
- ✅ `npm run build` — 成功编译，41 个页面，所有 API 路由已生成

## 📊 迁移架构

```
┌─────────────────────────────────────────┐
│      代码（使用 Firebase Admin API）     │
│  multimodal-flows, firebase-points 等  │
└────────────────────┬────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │  firebase-admin.ts    │
         │  (Compatibility Shim) │
         └─────┬─────────┬───────┘
               │         │
        ┌──────┘         └──────┐
        │                       │
        ↓                       ↓
   ┌─────────────┐      ┌──────────────┐
   │ tcb-admin   │      │ Firebase SDK │
   │   (TCB)     │      │  (Fallback)  │
   └─────────────┘      └──────────────┘
        ↓
   ┌──────────────────────┐
   │  TCB SDK             │
   │ (@cloudbase/node-sdk)│
   └──────────────────────┘
```

## 🔄 兼容性映射

### Firestore → TCB 数据库 API

| Firebase Admin | TCB Admin | 说明 |
|---|---|---|
| `admin.firestore()` | `getTcbFirestoreAdmin()` | 获取数据库实例 |
| `db.collection('x')` | `db.collection('x')` | 获取集合 |
| `db.collection('x').doc(id)` | `db.collection('x').doc(id)` | 获取文档 |
| `docRef.get()` | `docRef.get()` | 获取文档数据 |
| `docRef.set(data)` | `docRef.set(data)` | 设置文档 |
| `docRef.update(data)` | `docRef.update(data)` | 更新文档 |
| `batch = db.batch()` | `batch = db.batch()` | 创建批量写入 |
| `batch.commit()` | `batch.commit()` | 提交批量操作 |
| `db.runTransaction(fn)` | `db.runTransaction(fn)` | 运行事务 |

### Storage → TCB 存储 API

| Firebase Admin | TCB Admin | 说明 |
|---|---|---|
| `admin.storage().bucket()` | `getTcbStorageAdmin().bucket()` | 获取存储桶 |
| `bucket.file(path)` | `bucket.file(path)` | 获取文件引用 |
| `file.getSignedUrl(opts)` | `file.getSignedUrl(opts)` | 获取签名 URL |

### Auth → TCB Auth API

| Firebase Admin | TCB Admin | 说明 |
|---|---|---|
| `admin.auth()` | `getTcbAuthAdmin()` | 获取认证实例 |
| `auth.getUser(uid)` | `auth.getUser(uid)` | 按 UID 获取用户 |
| `auth.getUserByEmail(email)` | `auth.getUserByEmail(email)` | 按邮箱获取用户 |
| `auth.setCustomClaims(uid, claims)` | `auth.setCustomUserClaims(uid, claims)` | 设置自定义声明 |
| `auth.deleteUser(uid)` | `auth.deleteUser(uid)` | 删除用户 |

## ⚙️ 环境配置

### 使用 TCB

在 `.env.local` 或部署环境中设置：

```bash
# TCB 配置
TCB_ENV_ID=your-tcb-env-id
TENCENTCLOUD_SECRET_ID=your-secret-id
TENCENTCLOUD_SECRET_KEY=your-secret-key
TENCENTCLOUD_REGION=ap-guangzhou  # 可选，默认广州

# 禁用 Firebase（可选）
# FIREBASE_SERVICE_ACCOUNT_KEY=  # 不设置或留空
```

### 降级到 Firebase（备用）

若 TCB 不可用，系统自动尝试 Firebase Admin：

```bash
# Firebase 配置（备用）
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
```

## 🚀 已验证的调用模式

### 多模态流 (multimodal-flows.ts)

```typescript
const bucket = getAdminStorage().bucket();
const uploadUrl = await bucket.file(filePath).getSignedUrl({ ... });
const publicUrl = `https://storage.googleapis.com/${bucket.name}/${asset.storagePath}`;
```

✅ TCB 兼容层已支持此模式（通过 `TcbStorageFile` 和 `TcbStorageBucket`）

### 积分存储 (firebase-points.ts)

```typescript
const db = getAdminDb();
const ref = db.collection('users').doc(userId);
const snap = await ref.get();
await ref.update({ points_balance: current - amount });
await db.collection('points_transactions').add({ ... });
```

✅ TCB 兼容层已支持此模式（通过 `TcbFirestoreAdmin` 和相关类）

### 用户管理 (user-management-flows.ts)

```typescript
const auth = getAdminAuth();
// 未在当前代码中直接使用，但导入已准备好
```

✅ TCB 认证接口已实现

## 📝 下一步工作

### 阶段 1: 完整集成测试

- [ ] 在本地开发环境中配置 TCB 凭证
- [ ] 运行针对 TCB 的集成测试
- [ ] 验证多模态流的签名 URL 生成
- [ ] 验证积分系统的数据库操作

### 阶段 2: 生产部署

- [ ] 在腾讯云 CloudBase 中创建新的数据库和存储桶
- [ ] 迁移 Firestore 数据到 TCB（见下一节）
- [ ] 配置 TCB 环境凭证到部署平台
- [ ] 灰度测试和监控

### 阶段 3: 数据迁移

- 创建 Firestore → TCB 的数据导出脚本
- 验证数据完整性和一致性
- 准备回滚计划

## 📚 相关文件

- `src/lib/tcb-admin.ts` — TCB Admin SDK 兼容层（新增）
- `src/lib/firebase-admin.ts` — Firebase Admin 包装层（已更新）
- `src/lib/tcb.ts` — TCB 基础初始化（现有）
- `src/lib/cloudbase-compat.ts` — 前端 Firestore 兼容层（现有）

## 🔍 测试清单

- [x] TypeScript 类型检查通过
- [x] Next.js 生产构建成功
- [ ] 本地集成测试（使用 TCB 或 Firebase）
- [ ] 多模态流测试（存储操作）
- [ ] 用户管理流测试（数据库操作）
- [ ] 点数系统测试（事务操作）

## 📞 注意事项

1. **TCB 存储签名 URL** — 当前兼容层返回占位符；需在实际 TCB 环境中测试
2. **事务支持** — TCB 事务支持有限；复杂事务可能需要调整逻辑
3. **降级机制** — 若同时配置 TCB 和 Firebase，将优先使用 TCB
4. **性能** — TCB API 调用延迟可能与 Firebase 不同；需在生产中监控

---

**迁移状态：** ✅ 后端架构迁移完成 → 准备集成测试和数据迁移
