# ActionFlow（行动秩序）产品背景说明

> 本文档用于向其他 AI 工具或协作者说明本产品的定位、技术栈与全部功能，作为后续优化的背景参考。

## 一、产品定位

**ActionFlow（中文名：行动秩序）** 是一款面向个人的待办与轻量项目管理应用，Slogan 为「随手记录，灵活规划，高效执行」。核心理念是：先无压力地随手收集待办，再灵活整理到不同优先级区域，最后落到「当日计划」中按时段推进执行——即「收集 → 整理 → 规划 → 执行」的闭环。

- 应用类型：Web 应用（支持 PWA 安装）+ Electron 桌面客户端（macOS / Windows / Linux）
- 目标用户：需要管理个人任务、并希望按优先级和时段安排一天工作的个体用户
- 数据模型：多用户，各自数据隔离，通过账号登录使用

## 二、技术栈

| 层面 | 技术 |
| --- | --- |
| 前端框架 | Next.js 15（App Router）+ React 19 |
| 样式 | Tailwind CSS 3 |
| 拖拽交互 | @hello-pangea/dnd（主区域）、@dnd-kit（项目概览区） |
| 后端 | Next.js API Routes |
| 数据库 | SQLite / libSQL（Turso），通过 Prisma + @prisma/adapter-libsql 访问 |
| 认证 | JWT（jose）+ bcryptjs 密码哈希，token 存于 HttpOnly cookie，有效期 30 天 |
| 数据校验 | zod |
| 桌面端 | Electron 30 + electron-builder |
| 部署 | 支持 Render / Netlify（含免费实例保活机制） |

## 三、核心数据模型

- **User**：用户账号（昵称、密码哈希）
- **ProjectGroup**：项目分组，可折叠、可排序
- **Project**：项目，带颜色标识，归属于某个分组
- **Task**：任务（项目下的二级归类），用于聚合待办
- **Todo**：待办事项，核心实体，字段包含：
  - `title` / `description`（标题、备注）
  - `completed` / `completedAt`（完成状态与完成时间）
  - `priority`（low / medium / high 优先级）
  - `zone`（整理区域：0=未整理、1=优先做、2=稍后做、3=晚点做）
  - `order`（区域内排序）
  - `scheduledDate`（计划日期）
  - `projectId` / `taskId`（所属项目、任务）
- **DailyPlan / DailyPlanItem**：当日计划及其条目，条目含时段（morning/afternoon/evening 上午/下午/晚上）与状态（pending/in_progress/completed 未开始/进行中/已完成）
- **RecurringTodo**：周期性待办，按重复星期（如周一/周三/周五）自动生成待办，记录已生成与已完成日期

## 四、功能清单

### 1. 用户与认证
- 注册、登录、退出（[`AuthForm.tsx`](src/components/AuthForm.tsx)）
- JWT + Cookie 会话保持，登录态自动检测
- 用户数据隔离，页头展示昵称与「进行中 / 已完成」统计

### 2. 待办收集（添加区）
- 顶部快速输入框，回车即可添加，默认进入「未整理」区（zone=0）
- 可选择所属项目、可展开填写备注
- 支持中文输入法合成态判断，避免误触发提交

### 3. 待办整理（四区看板）
- **未整理区**：双列网格展示所有新收集待办，超过 6 项时给出「先挑几个安排一下」的温和提
- **已安排区**：三列看板——「优先做（红）」「稍后做（橙）」「晚点做（蓝）」
- 拖拽在各区之间移动待办并实时保存排序（[`/api/todos/reorder`](src/app/api/todos/reorder/route.ts)）
- 每个区显示完成进度条（按完成比例动态变色）
- 已完成待办：非「未整理」区中，仅保留「今天完成」的可见，历史已完成自动隐藏保持清爽

### 4. 待办条目操作（[`TodoItem.tsx`](src/components/TodoItem.tsx)）
- 勾选完成/取消，完成时随机弹出鼓励文案（如「完成一件，秩序 +1」）
- 编辑标题、备注、优先级、所属项目、区域、计划日期（[`TodoForm.tsx`](src/components/TodoForm.tsx)）
- 删除待办
- 一键「加入当日计划」
- 备注展开/收起

### 5. 项目与分组管理（[`ProjectGroupSelector.tsx`](src/components/ProjectGroupSelector.tsx)）
- 创建项目分组、创建项目（自动分配预设颜色）
- 分组折叠/展开
- 项目在分组间移动、删除项目（级联清理其下待办）

### 6. 项目情况概览（[`ProjectOverview.tsx`](src/components/ProjectOverview.tsx)）
- 按项目/任务聚合展示待办与完成情况
- 项目卡片拖拽排序、修改项目颜色（15 色预设板）
- 项目下快速添加待办、新建任务（Task）
- 将待办在不同任务/项目间移动

### 7. 当日计划（[`DailyPlanSection.tsx`](src/components/DailyPlanSection.tsx)）
- 按「上午 / 下午 / 晚上」三时段组织当天要执行的待办
- 从待办区拖拽加入计划，或通过选择器搜索添加
- 计划内跨时段拖拽移动
- 条目状态切换：未开始 / 进行中 / 已完成
- 日期导航：前后翻页、回到今天
- 顶部完成度统计

### 8. 周期性待办（Recurring Todo）
- 设定按星期重复的固定待办（[`/api/recurring-todos`](src/app/api/recurring-todos/route.ts)）
- 自动为符合日期生成待办实例，记录生成与完成历史

### 9. 部署与运维辅助
- 健康检查接口 [`/api/health`](src/app/api/health/route.ts)
- 前端保活轮询：页面打开后每 5~15 分钟随机 ping health，防止免费实例休眠
- 数据库迁移脚本（v2~v6，位于 `scripts/`）
- PWA 支持（[`manifest.json`](public/manifest.json) + Service Worker）

## 五、交互与体验特点
- 全局采用浅灰底（#f5f6f8）+ 白色卡片的简洁风格
- 大量使用乐观更新（Optimistic UI），操作后先更新本地状态再同步后端，失败回滚
- 拖拽为核心交互，贯穿待办整理、计划编排、项目排序
- 完成待办时的正向反馈文案，强化「秩序感」情绪价值

## 六、待优化方向提示（供参考）
- 移动端适配与触屏拖拽体验
- 数据统计/可视化（趋势、完成率图表）
- 搜索、过滤、标签能力
- 提醒/通知机制
- 周期性待办的可视化管理入口