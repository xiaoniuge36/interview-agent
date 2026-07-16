# 平台级账号治理与数据看板设计

## 目标

在既有 `apps/admin-console` 管理后台内新增“数据看板”和“账号管理”视图，为平台运营人员提供跨租户的数据洞察和账号治理能力；不新增独立系统、独立域名或第二套认证入口。

## 范围与非目标

- 范围：全站账号查询、筛选、导出、详情、角色调整、启用/禁用、本地账号密码重置；全局运营数据看板；治理审计；平台管理员权限边界。
- 范围：后台账号和用户端账号统一展示。账号通过角色和所属租户区分，而不是拆成两套账号库。
- 非目标：不在后台新建或删除账号；本地账号仍由既有注册流程创建，OIDC 账号仍在首次登录时自动创建。
- 非目标：不重做既有“治理总览”。它继续展示当前租户的内容审核、题库、模型和运行状态；新增看板专门服务全站平台运营。
- 非目标：不增加图表库。沿用 Ant Design 的 `Statistic`、`Card`、`Progress`、`Table`、`Segmented` 和传统筛选表格交互。

## 总体架构

功能继续挂载在既有 Product API 的 `AdminModule` 和既有管理控制台中：

```text
Admin Console（现有站点）
  ├─ 数据看板 #analytics ───── GET /admin/platform/dashboard
  └─ 账号管理 #accounts
       ├─ GET /admin/accounts/query | /export | /:id
       ├─ PATCH /admin/accounts/:id/role
       ├─ PATCH /admin/accounts/:id/status
       └─ PATCH /admin/accounts/:id/local-password

Product API（现有 AdminModule）
  ├─ PlatformDashboardService：跨租户聚合
  ├─ AccountGovernanceService：账号查询与受控变更
  └─ Identity / LocalAuth：每次认证读取账号状态，阻断禁用账号
```

所有上述端点仅接受 `platform_admin`。现有 `admin`、`question_reviewer` 的控制器及其租户范围保持不变。

## 权限与认证模型

### 新角色与作用域

新增 `platform_admin` 角色及以下作用域：

- `analytics:read`：读取全站运营数据看板。
- `account:read`：查询、导出、查看全站账号。
- `account:write`：修改角色、状态和本地密码。

`platform_admin` 拥有既有后台治理作用域以及上述平台作用域，但跨租户访问仅在明确使用 `analytics:*`、`account:*` 的平台端点生效。`PolicyService` 对其它资源仍按租户判断，避免把平台角色意外变成任意业务资源的无条件读写权限。

现有本地系统管理员 bootstrap 改为创建或升级成 `platform_admin`。开发身份仍仅模拟 `admin`，不模拟平台管理员，防止开发开关绕过平台权限。

### 角色来源与 OIDC

数据库中保存的角色是已存在账号的权限真相。OIDC 的角色 claim 只用于首次创建账号，后续请求仅更新可选的展示字段（姓名、邮箱），不得覆盖平台管理员已设定的角色。这样 OIDC 账号的角色调整才会持久且可审计。

本地 JWT 的 role claim 也不作为授权真相：每次受保护 API 请求都经身份解析回查 `User`，用数据库角色生成 Actor。令牌只用于确认主体与其租户归属。

## 数据模型与账号状态

`User` 新增：

- `status`：`active` 或 `disabled`，默认 `active`。
- `disabledAt`、`disabledByUserId`：账号被禁用时写入，启用时清空。
- `lastSignedInAt`：本地登录成功或 OIDC / JWT 认证成功后更新。

账号来源不另建冗余字段：查询时通过 `LocalCredential` 是否存在识别“本地账号”；没有本地凭据的账号显示为 OIDC / 外部身份。详情不返回密码哈希、密文凭据或令牌内容。

为支撑全站筛选，增加账号状态、创建时间和登录时间索引；保留现有 `(tenantId, subject)` 唯一约束与本地邮箱全局唯一约束。

## 账号治理规则

### 列表与详情

账号管理使用传统 Ant Design 后台模式：顶部 `Form` 筛选项，右侧“查询 / 重置 / 导出”，下面为可分页表格。可按关键词、账号类型（后台/用户端）、角色、状态、认证来源、租户、注册时间范围筛选。

表格显示姓名、邮箱或 subject、账号类型、角色、状态、认证来源、所属租户、最近登录、创建时间和操作。账号类型规则为：`platform_admin`、`admin`、`question_reviewer`、`support` 显示为“后台账号”，`user` 显示为“用户端账号”；`agent_runtime` 不出现在人工账号治理列表中。

详情使用 Drawer，包含基础身份、租户、状态、最近登录、凭据类型和最近账号治理审计记录。导出沿用现有 CSV 下载约束，最多 10,000 行，并生成审计事件。

### 写操作

- 修改角色：仅允许人工可管理角色 `user`、`question_reviewer`、`admin`、`support`、`platform_admin`，不允许将账号设为 `agent_runtime`。
- 启用 / 禁用：禁用写入禁用时间和操作者；启用清空两项禁用信息。
- 本地密码重置：仅在账号关联 `LocalCredential` 时显示。使用既有密码输入规则、服务端哈希后写入，响应不包含密码或哈希。OIDC / 外部账号在界面与 API 都明确返回“需在身份提供方重置”。
- 所有写操作要求二次确认；密码重置使用 Drawer 内独立表单而不是把密码放在列表中。

### 不可违反的保护

- 不允许操作者禁用自己。
- 不允许操作者把自己降级为非 `platform_admin`。
- 不允许禁用或降级系统中最后一个 `platform_admin`。
- 禁用账号后，下一次受保护 API 请求立即拒绝；本地账号下一次登录也拒绝。已签发 JWT 不需要等待过期才失效。
- 写操作采用事务，先读取目标、计算 `platform_admin` 数量，再更新并写入审计日志，避免并发下留下零个平台管理员。
- 审计 action 统一使用 `account:role_updated`、`account:status_updated`、`account:password_reset`、`account:exported`，metadata 仅记录安全字段（旧/新角色、旧/新状态、来源与计数），绝不记录密码明文、哈希或 token。

## 数据看板

仅 `platform_admin` 可见。导航位置为“运营总览”分组中的“数据看板”；原“治理总览”保留在同一分组，含义不变。

顶部提供“今日 / 近 7 天 / 近 30 天”时间窗口；服务端以 UTC 边界聚合并返回窗口起止时间。看板展示：

1. 账号概况：注册账号总量、窗口内新增账号、活跃账号（窗口内成功认证）、已禁用账号、租户数，以及后台/用户端账号构成。
2. 内容漏斗：导入任务、待审核候选题、已发布题目、失败导入；使用数值卡片与 Progress 表现转化，不做模拟趋势图。
3. 训练业务：窗口内创建面试、报告生成数、练习提交数、练习报告数。
4. Agent 健康：运行次数、成功率、Schema 通过率、平均延迟、降级次数；附最近失败运行的紧凑表格，方便跳转既有“运行观测”。

所有指标来自现有 Prisma 持久化记录，按全站聚合；无数据时返回零值和空列表，而不是填充假数据。

## 管理端集成与交互

`AdminView` 增加 `analytics` 与 `accounts`，已有 hash 路由、侧栏、顶部搜索、面包屑、全局刷新机制全部复用。

- `AnalyticsDashboard`：根据 `Segmented` 选择的窗口请求真实端点；状态沿用现有 `SectionFeedback`，加载时在内容区域居中显示。
- `AccountManagement`：复用 `useAdminPagedList`、`AdminTableControls`、`useAdminListExport` 的模式；查询由用户点击“查询”主动触发，分页自动复用当前已提交条件。
- 无权限时不显示平台导航入口；接口 403 仍使用全局传统错误提示。401 继续由现有 `AdminGlobalFeedback` 触发登出和回到登录页。
- 写成功后使用 Ant Design `message.success`，刷新当前表格、详情和数据看板缓存；失败使用统一错误提示，不向界面泄露内部错误。

## API 与契约

在 `packages/contracts` 中定义并运行时校验：

- `PlatformDashboardQuerySchema`、`PlatformDashboardSchema`。
- `AccountStatusSchema`、`AccountViewSchema`、`AccountDetailSchema`、`AccountListQuerySchema`。
- `UpdateAccountRoleInputSchema`、`UpdateAccountStatusInputSchema`、`ResetLocalPasswordInputSchema`。
- 通用分页响应与 CSV 字段映射。

新 API：

```text
GET   /admin/platform/dashboard?period=today|7d|30d
GET   /admin/accounts/query?...page&pageSize
GET   /admin/accounts/export?...
GET   /admin/accounts/:id
PATCH /admin/accounts/:id/role
PATCH /admin/accounts/:id/status
PATCH /admin/accounts/:id/local-password
```

每个端点同时使用 `@Roles('platform_admin')` 与对应的 `PolicyService` scope 校验，形成路由和业务两层保护。

## 错误处理

- `ACCOUNT_DISABLED`：认证主体存在但状态为禁用，返回稳定错误，不继续执行请求。
- `ACCOUNT_LOCAL_CREDENTIAL_REQUIRED`：目标没有本地凭据，拒绝密码重置。
- `ACCOUNT_SELF_MUTATION_FORBIDDEN`：禁止禁用或降级自身。
- `PLATFORM_ADMIN_LAST_MEMBER_PROTECTED`：阻止最后一个平台管理员被禁用或降级。
- `ACCOUNT_ROLE_NOT_MANAGEABLE`：拒绝 `agent_runtime` 等不可人工设置的角色。

错误遵循现有统一 API envelope，管理端通过既有全局反馈统一展示。

## 测试与验收

- Contracts：角色、作用域、账号输入、看板响应和筛选查询的边界测试。
- API：平台端点的路由鉴权、跨租户列表、分页筛选、导出、审计、禁止自我变更、最后管理员保护、OIDC 重置拒绝。
- 认证：禁用账号无法本地登录；既有 JWT / OIDC 用户在下一次 API 请求被拒绝；成功认证更新最近登录；OIDC role claim 不覆盖已治理角色。
- 前端：导航可见性、hash 路由、看板窗口请求、主动查询、导出、操作确认、成功/失败提示、密码重置入口限制。
- 手工验收：使用 bootstrap 本地平台管理员登录现有后台，能看到两个新模块；普通 admin 不能看到或访问它们；禁用账号后下一次请求立即失败；数据看板全部来自真实 API。

## 实施顺序

1. 扩展 Prisma enum / `User` 字段并生成迁移，升级 bootstrap 管理员。
2. 扩展 contracts、请求上下文、认证与策略，先确保状态和平台权限正确。
3. 在既有 `AdminModule` 增加平台看板和账号治理服务、控制器、CSV 与测试。
4. 在既有管理控制台接入导航、数据看板、账号列表/详情/操作界面与测试。
5. 执行 Prisma 校验、contracts 生成检查、单元/集成测试、管理端 typecheck/lint/build 和浏览器烟测。
