# 腾讯云 SCF 云函数示例

本目录提供将后台任务迁移至腾讯云函数（SCF）的示例骨架。

## 环境变量

- TCB_ENV_ID 或 CLOUDBASE_ENV_ID
- TENCENTCLOUD_SECRET_ID
- TENCENTCLOUD_SECRET_KEY
- TENCENTCLOUD_REGION（可选，默认 ap-guangzhou）

## 部署思路

- 使用 Serverless Framework 或 腾讯云命令行工具（tcb/云函数控制台）进行部署。
- 函数入口采用 `exports.main_handler = async (event, context) => { ... }`。

## 示例函数

- `functions/pointsGrant`：批量发放积分（例如定时给活跃用户或新品试用用户赠送积分）。

> 注意：代码示例使用 `@cloudbase/node-sdk` 访问 TCB 数据库。
