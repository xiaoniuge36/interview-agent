# Ant Design 高密度后台改造设计

## 背景与目标

管理后台当前以手写 CSS 与自定义控件模拟管理台外观。此次改造将 `apps/admin-console` 收敛为实际使用 Ant Design 的传统高密度后台：深色侧栏、顶栏、面包屑、紧凑筛选区、数据表格、受控分页与抽屉详情。

用户选择“方案 C（高密度数据台）”。首屏优先呈现筛选、状态与表格，不为装饰性卡片牺牲数据密度。

## 范围

### 包含

- 在 `@interview-agent/admin-console` 新增 `antd` 与 `@ant-design/icons`。
- 使用 `ConfigProvider`、`Layout`、`Menu`、`Breadcrumb`、`Card`、`Table`、`Input.Search`、`Select`、`Pagination`、`Drawer`、`Form`、`Tag`、`Alert`、`Empty`、`Result`、`Spin`、`Statistic` 与 `Button` 重建后台视觉与交互。
- 覆盖总览、资料导入、题库管理、审核工作台、模型治理、运行观测、审计日志与管理员访问页。
- 将重复的手写筛选栏、分页、抽屉、状态标签样式替换为 Ant Design 组件与最小布局 CSS。
- 补齐与改造直接相关的单元测试，并完成浏览器级界面验证。

### 不包含

- 不修改 Product API、数据库、迁移、认证协议、领域契约或权限策略。
- 不把 Hash 视图迁移为新的 Next.js 路由。
- 不添加没有业务动作支撑的行选择或批量操作。
- 不把 `useAdminDashboard` 的并行加载替换为各表格自行请求。

## 不可变行为

- 继续通过 `#overview/#imports/#questions/#content/#models/#runtime/#audit` 控制活动模块；旧 Hash 别名继续可用。
- 七个视图持续挂载，仅隐藏非活动面板，以保留筛选条件、页码和打开的详情状态。
- 侧栏折叠状态继续存入 `admin-console.sidebar-collapsed`。
- 所有数据仍来自既有 `useAdminDashboard`、`api.ts` 与训练内容 API；刷新、登出、导入成功后的全量刷新保持原行为。
- 审核必须显式点击行操作才打开详情；候选题消失时自动关闭；只有 `approved` 状态可发布。
- 列表均维持既有本地筛选和 `paginateRecords` 语义。Ant Design `Table` 关闭内置分页，统一使用受控 `Pagination`，避免重复切片。

## 组件架构

### 应用壳

`AdminShell` 作为唯一的 Ant Design 壳入口：

```text
ConfigProvider (中文 locale / 高密度 token)
└─ Layout
   ├─ Sider (品牌、Menu、折叠控制)
   └─ Layout
      ├─ Header (折叠、搜索、刷新、身份、退出)
      └─ Content (Breadcrumb + 持续挂载的 DashboardViews)
```

- `Menu` 按“运营总览 / 内容治理 / 系统观测”分组，仍调用现有 `onViewChange`。
- `Header` 使用紧凑的 `Input` 搜索、`Avatar`、`Dropdown`/`Button` 与刷新状态，不另建自定义交互体系。
- `ConfigProvider` 以现有蓝色主色、`#001529` 侧栏和紧凑尺寸为基础，避免继续维护成片的仿制 token。

### 可复用管理控件

- `AdminTableControls` 保持其业务输入接口，内部改为 `Input.Search`、`Select`、`Pagination`。
- `AdminDrawer` 保持调用方 props，内部改为 Ant Design `Drawer`，以降低训练内容编辑器的改动范围。
- 统一提供状态 `Tag` 映射与表格列的空态处理，禁止各页面继续复制状态 CSS。
- `SectionFeedback` 将加载、空、无权限、失败分别映射为 `Spin`、`Empty`、`Result`、`Alert`，保留原状态机分支。

## 页面映射

| 模块 | 主要 Ant Design 组件 | 关键要求 |
| --- | --- | --- |
| 总览 | `Alert`、`Statistic`、`Card`、`Table/List`、`Tag` | 仅保留治理待办、关键指标和最近运行，紧凑呈现。 |
| 资料导入 | `Card`、`Table`、`Input.Search`、`Select`、`Pagination`、`Drawer`、`Form` | 导入成功关闭抽屉并调用既有 `onChanged()`。 |
| 题库管理 | `Card`、`Table`、`Input.Search`、`Select`、`Tag`、`Pagination` | 只浏览正式题库；筛选状态、难度与关键词保留。 |
| 审核工作台 | `Card`、`Table`、`Drawer`、`Form`、`Descriptions`、`Alert` | 行内“审核”打开详情；编辑、审核与发布门禁不变。 |
| 模型治理 | `Table`、`Select`、`Tag`、`Pagination` | 保持只读的路由、预算与 Schema 信息。 |
| 运行观测 | `Table`、`Tag`、`Pagination` | 保留阶段、Trace、延迟、Schema、降级语义。 |
| 审计日志 | `Table`、`Tag`、`Typography.Text` | 保留动作、资源、操作者、结果、Trace 与时间。 |
| 管理员访问 | `Layout`、`Card`、`Form`、`Input`、`Button`、`Alert` | 保留本地 / OIDC 流程与角色校验。 |

## 视觉与可用性

- 桌面端内容区使用 16px 左右间距、40–48px 表格行高与紧凑筛选区；表头固定，宽度不足时横向滚动。
- 大屏侧栏默认展开，窄屏自动收起；筛选项换行，表格仍可横向浏览。
- 状态颜色遵循 AntD 语义色，文字与图标保持足够对比度。
- 使用实际 `@ant-design/icons`，不新增图片资产。
- 依赖 AntD 原生可访问性，同时保留业务需要的标题、`aria-label`、状态播报和 Escape 关闭行为。

## 数据流与异常处理

1. `AdminDashboard` 继续一次性调用 `useAdminDashboard`，并行获取全部模块数据。
2. 业务页只在内存数据上筛选、排序和分页；不新增数据请求。
3. `401` 仍走既有会话恢复；单模块 `403`、加载和错误由 `SectionState` 按页面展示。
4. 导入、保存审核、发布等 mutation 成功后继续触发现有刷新；失败直接呈现原错误信息，不吞掉 API 错误。
5. `Drawer` 关闭卸载详情表单，避免残留失效候选题和旧字段值。

## 验证计划

- 单元测试：Hash 导航、页码计算与边界、抽屉 Escape/关闭、候选题选择/消失、筛选与分页。
- 静态检查：`test`、`lint`、`typecheck`、`build`。
- 浏览器验证：管理员登录后核对高密度壳、7 个菜单、表格筛选/翻页、导入抽屉、审核抽屉、错误/空态与窄屏侧栏。
- 若本地环境无法获取管理员会话，记录阻塞原因并至少验证登录页、静态构建与组件级测试。

## 风险与缓解

- Ant Design CSS 与现有全局样式可能冲突：先引入 reset 与 theme token，再清理仅后台消费的重复样式，避免影响 User Portal。
- 工作区存在大量未提交修改：只接触 `apps/admin-console` 与本设计/计划文件，不覆盖其他应用和共享契约。
- 核心壳、表格控件和训练内容表单是共享冲突面：按“主题与壳 → 共享表格/抽屉 → 页面 → 集成验证”顺序串行改造。
