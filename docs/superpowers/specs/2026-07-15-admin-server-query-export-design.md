# 管理后台服务端查询与导出设计

## 目标

将 `apps/admin-console` 的六个列表从“首屏全量数组 + 浏览器筛选分页”改为真实 Product API 的服务端筛选、分页与 CSV 导出，并采用传统 B 端的筛选栏布局。

## 已确认的事实

- 现有后台不是前端 mock：控制台通过带认证头、`cache: 'no-store'` 的请求访问 `http://localhost:3001/api/admin/*`，后端使用 Prisma 查询真实数据库。
- 当前体验像静态数据，是因为后端返回固定上限数组（100/200/500 条），前端仅在首屏或全局刷新时请求，随后所有筛选和分页都在内存中执行。
- 现有接口没有分页元数据、查询参数或导出路由。

## 方案

保留已有数组接口以避免破坏其他调用方；新增以下兼容路由：

```text
GET /admin/imports/query      GET /admin/imports/export
GET /admin/questions/query    GET /admin/questions/export
GET /admin/candidates/query   GET /admin/candidates/export
GET /admin/model-profiles/query  GET /admin/model-profiles/export
GET /admin/agent-runs/query   GET /admin/agent-runs/export
GET /admin/audit-logs/query   GET /admin/audit-logs/export
```

所有 `query` 路由返回统一的 JSON：

```json
{ "items": [], "page": 1, "pageSize": 20, "total": 0 }
```

共同参数为 `keyword`、`page`、`pageSize`。资源专属条件为：

| 资源 | 额外筛选 |
| --- | --- |
| 导入任务 | `status` |
| 正式题库 | `status`、`difficulty` |
| 候选题 | `status`、`importTaskId` |
| 模型 | `status` |
| Agent 运行 | `status` |
| 审计日志 | `result` |

`export` 使用相同筛选条件、同一权限与租户范围，不使用页面分页。服务端生成 UTF-8 BOM CSV，最大 10,000 行，转义 CSV 字段和 Excel 公式前缀，并记录审计日志。

前端每个列表保留“草稿筛选条件”和“已提交筛选条件”：用户修改输入不会发请求；点击“查询”或按 Enter 才提交并回到第 1 页；翻页继续带已提交条件；“重置”恢复默认条件并重新查询；“导出”下载同条件 CSV。筛选栏左侧放条件，右侧放“查询 / 重置 / 导出”。

导入任务的“去审核”将使用 `#content?importTaskId=<id>` 跳转，审核工作台读取该参数并用服务端 `importTaskId` 筛选，避免落入全量候选题队列。

## 边界与风险

- 不引入数据库迁移；现有 tenant、状态和时间索引足以支持首版。
- 不新增批量操作或 XLSX 依赖，首版导出为 CSV。
- 不改变 `ImportTask` 的完成状态语义：候选题发布/拒绝后如何定义“导入已发布”需单独确定，避免错误地把含拒绝项的任务标为已发布。
- 所有查询必须沿用现有 `PolicyService` 和 tenant 条件；不能在前端导出当前页来替代服务端导出。
