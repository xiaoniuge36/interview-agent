# 用户主题偏好云同步设计

## 背景

当前 C 端六套主题和界面动效开关仅保存于浏览器 `localStorage`：

- `offerpilot:theme-preferences:v2`
- `{ theme, motion }`

这能保证首屏无闪烁和离线可用，但无法随登录用户跨设备同步。本次改造将主题与动效作为用户拥有的偏好数据写入 Product API 数据库，同时保留本地副本用于首屏、未登录状态和服务不可用时的降级。

## 目标

- 六套主题与动效开关跟随登录用户跨设备同步。
- 未登录页面继续支持本地主题切换。
- 登录首屏继续从本地立即应用，避免等待 API 时出现主题闪烁。
- 服务端已有记录时服务端优先；服务端没有记录时首次上传当前设备的本地偏好。
- 快速连续切换时保证数据库最终保存最后一次选择。
- 保持租户隔离、用户所有权、输入校验和审计记录。

## 非目标

- 不同步字体缩放、布局密度、语言或滚动条设置。
- 不删除现有 `localStorage` v1/v2 迁移兼容。
- 不在本次任务中直接对任何数据库执行迁移。
- 不改变 Admin Console 或 Agent Runtime。

## 数据模型

新增 `UserPreference`：

| 字段        | 类型       | 说明                 |
| ----------- | ---------- | -------------------- |
| `id`        | `String`   | 主键，`cuid()`       |
| `tenantId`  | `String`   | 租户边界             |
| `userId`    | `String`   | 偏好所有者           |
| `theme`     | `String`   | 六套主题之一         |
| `motion`    | `Boolean`  | 是否启用界面动态效果 |
| `createdAt` | `DateTime` | 创建时间             |
| `updatedAt` | `DateTime` | 最后更新时间         |

约束：

- `@@unique([tenantId, userId])`：每个用户只有一份偏好。
- `@@unique([tenantId, id])`：保持项目现有租户安全主键模式。
- `(tenantId, userId)` 组合外键关联 `User(tenantId, id)`。
- `tenantId` 外键关联 `Tenant(id)`。
- 删除策略沿用现有用户资源：`ON DELETE RESTRICT`。

数据库使用字符串保存主题，合法值由共享 Zod 契约和服务端写入路径强校验，避免为纯 UI 枚举增加跨层 Prisma enum 耦合。

## 契约与权限

共享契约新增：

- `ThemeModeSchema`
- `ThemePreferencesSchema`
- `UserPreferenceSchema`
- `UserPreferencePayloadSchema`：`{ preferences: UserPreference | null }`
- `UpsertUserPreferenceInputSchema`：`{ theme, motion }`

新增权限：

- `preferences:read`
- `preferences:write`

普通 `user` 角色默认拥有这两个 scope。服务端每次读取和写入都同时校验：

- 当前租户为 `context.tenantId`
- 所有者为 `context.actor.id`
- 调用者具备对应 scope

## Product API

新增 `UserPreferencesModule`：

- `GET /user-preferences`
  - 无记录返回 `{ preferences: null }`
  - 有记录返回已校验的主题、动效和更新时间
- `PUT /user-preferences`
  - 使用共享契约校验请求体
  - 按 `(tenantId, userId)` 执行 `upsert`
  - 写入 `preferences.upsert` 审计事件
  - 返回最新偏好

该接口只接受当前登录用户自身偏好，不接受客户端传入 `tenantId`、`userId` 或任意资源 ID。

## 前端同步状态机

`AuthProvider` 调整为包裹 `ThemePreferencesProvider`，使主题 Provider 能读取当前认证身份，同时登录页仍处于同一主题上下文中。

### 首屏

1. `layout.tsx` 内联脚本继续读取本地 v2/v1 偏好并设置 `html[data-theme]`、`html[data-motion]`。
2. React Provider 初始化时读取相同本地值，保持水合一致。
3. 未登录时停止于本地模式，不调用偏好 API。

### 登录同步

1. 身份可用后调用 `GET /user-preferences`。
2. 服务端有记录：
   - 服务端值覆盖当前 React 状态。
   - 立即应用到 `document.documentElement`。
   - 同步更新本地 v2 副本。
3. 服务端无记录：
   - 把当前设备已解析的本地偏好通过 `PUT` 首次上传。
   - 使用服务端返回值确认同步完成。

### 用户切换

1. `setTheme` / `setMotion` 立即更新 React、DOM 和本地副本。
2. 已登录且初始同步完成后，把最新偏好加入保存队列。
3. 保存队列同一时间只发送一个 `PUT`：
   - 请求进行中发生新变化时，只保留最新待保存值。
   - 当前请求完成后，如果待保存值不同，再发送下一次请求。
   - 因此数据库最终状态始终为最后一次选择，不受响应先后顺序影响。

### 账号切换与退出

- 退出登录不删除本地副本，保证当前设备页面视觉稳定。
- 新账号登录后重新执行服务端同步；该账号已有记录时覆盖当前设备副本。
- 不在账号之间复用已加载的服务端偏好状态。

## 错误与降级

- `GET` 网络失败：保留当前本地主题，不阻塞页面；本次会话后续偏好变更仍可触发保存尝试。
- 首次 `PUT` 失败：保持本地可用，不把同步状态标记为完成；后续变更继续尝试。
- 后续 `PUT` 失败：不回滚用户已看到的主题；保留最后待保存值，下一次偏好变更时再次发送最新值。
- API 返回非法数据：共享契约拒绝应用，继续使用已验证的本地值。
- 账号身份变化期间忽略旧账号请求结果，防止跨账号状态污染。

本次不新增打扰式错误提示。主题切换属于低风险个性化操作，网络失败采用静默本地降级；错误仍可由现有请求日志和服务端日志定位。

## 兼容与迁移

- 保留 v1 到 v2 的旧主题映射。
- 本地 v2 继续作为首屏缓存，不升级存储键。
- 新数据库表初始为空，因此现有用户首次登录后会上传当前设备主题。
- 一旦服务端存在记录，其他设备登录时服务端优先。
- Prisma 迁移文件仅创建表、索引和外键，不批量写入用户数据。

## 测试设计

### Contracts

- 接受六套合法主题和布尔动效。
- 拒绝未知主题、缺失字段和多余身份字段。
- `ActionSchema` 包含两个新权限。

### Product API

- 无记录读取返回 `null`。
- 读取只查询当前 `tenantId + userId`。
- 写入按当前用户 upsert，不信任客户端身份字段。
- 写入执行权限校验和审计记录。
- 非法主题在 Controller 契约边界被拒绝。

### User Portal

- 未登录只使用本地设置且不请求 API。
- 服务端有记录时覆盖本地值。
- 服务端无记录时上传当前本地值。
- 快速连续切换最终保存最后值。
- GET/PUT 失败不回滚当前主题。
- 身份切换忽略旧请求结果。
- 本地 v1/v2 迁移继续通过。

### 验证门槛

- 定向红绿测试。
- Contracts、Product API、User Portal 相关测试。
- 三个工作区的 lint/typecheck。
- Prisma format/validate。
- User Portal build。
- 浏览器验证登录用户切换、刷新和本地降级。

## 数据库执行边界

本任务生成 Prisma schema 和迁移 SQL，但不运行 `prisma migrate deploy`。实际执行前必须明确目标数据库的主机、端口和数据库名，并获得单独授权。
