# **数据库与核心AI流程设计文档**

**版本**: 2.3 (Final)
**日期**: 2024年8月20日

---

## 1. Firestore 数据库设计

### 1.1. `users` 集合 (已更新)

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `uid` | string | 用户唯一ID (同Auth UID)。 |
| `name` | string | 用户名。 |
| `email` | string | 邮箱。 |
| `role` | string | `admin`, `creator`, `supplier`, `user`。 |
| `starLevel`| number | (可选) 用户星级 (1-10)。 |
| `skills` | Array<string>| (可选, 针对 a'creator') 技能标签 (e.g., "3D建模", "角色设计")。 |
| `status` | string | (可选) 用户在线状态 ('active', 'inactive')。 |
| `aiAssistantEnabled`| `boolean`| (可选, 针对 'creator') 是否启用AI助理模式。 |
| `currentQueueSize`| `number`| (可选, 针对 'creator') 当前排队人数。 |
| `maxQueueSize`| `number` | (可选, 针对 'creator') 最大可接待排队人数。 |
| `bio` | string | (可选, 针对 'creator') 个人简介。 |

### 1.2. `demands` 集合 (已更新)

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | string | 文档ID。 |
| `type` | string | (新增) 需求类型 ('public', 'private')。默认为 'public'。 |
| `title` | string | 需求标题。 |
| `description`| string | 需求描述。 |
| `budget` | number | 预算 (人民币)。 |
| `category` | string | 需求类别。 |
| `status` | string | 需求状态 (`开放中`, `进行中`, `已完成`)。 |
| `requesterId`| string | 发布者ID。 |
| `creatorId` | string | (可选) 承接者/沟通对象ID。 |
... (其他元数据字段)

... (the rest of the document remains unchanged) ...
