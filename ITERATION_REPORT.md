# ActionFlow · 行动秩序 — 迭代简报与产品介绍

> 更新时间：2026-07-15

---

## 一、本轮迭代优化点

### 1. 三栏职责重构（commit `2097a72`）
- **改动**：中栏「今日」改为上午/下午/晚上时段分组，自成主视图；右栏「当日计划」仅在项目视图显示，非项目视图（今日/全部/收件箱）时自动隐藏并拓宽中栏。
- **价值**：各栏各司其职，视觉不重复，空间更聚焦。

### 2. 今日视图日期切换（commit `49a5d85`）
- **改动**：今日视图头部新增日期切换器，支持前后箭头切换任意日期，附「回今天」快捷按钮；非今日显示「X月X日 周几」。
- **价值**：可回顾昨日、规划明日，不再只锁定当天。

### 3. 左侧项目列表 CRUD（commit `036a360`）
- **改动**：项目行 hover 时显示铅笔（内联重命名）与垃圾桶（二次确认删除）；后端 DELETE 接口级联清理该项目下所有待办及当日计划引用。
- **价值**：项目管理不再需要跳设置页，鼠标停留即可操作。

### 4. 右栏拖拽体验优化（commit `f333c88`）
- **改动**：
  - 同时段内可拖拽调整顺序，`order` 字段持久化到 SQLite；
  - 拖入新待办改为**乐观更新**：本地立即插入临时项，POST 成功后 `fetchPlan` 同步真实数据，失败自动回滚。
- **价值**：拖拽排序即时生效；拖入有明确视觉反馈，不再"不知道加进去没"。

### 5. 完成状态双向同步（commit `4e47203`）
- **改动**：
  - 今日/右栏勾选计划项完成 → 同步更新对应待办的 `completed` 状态；
  - 项目视图/待办列表勾选待办完成 → 同步更新所有相同 `todoId` 的计划项 `status`；
  - 前端乐观更新 + 后端双端持久化。
- **价值**：三栏状态始终一致，不再出现"这里完了那里没完"。

---

## 二、产品介绍 — ActionFlow · 行动秩序

### 一句话定位
一款把「项目 → 任务 → 待办 → 每日计划」串成流水线的桌面级待办工具，让你把想做的事真正安排进当天的时段里。

### 核心工作方式：三栏工作法

| 栏位 | 视图 | 能力 |
|------|------|------|
| **左栏** | 项目导航 | 全部项目一览，拖拽排序、hover 内联重命名/删除 |
| **中栏** | 工作区 / 今日 | 项目视图下管理该项目的任务与待办；今日视图下按上午/下午/晚上分时段规划，可切换任意日期 |
| **右栏** | 当日计划 | 仅在项目视图出现，从工作区拖入待办即安排到今日，支持时段间与时段内拖拽排序 |

### 核心特性

- **时段化日历**：上午 🌅 / 下午 ☀️ / 晚上 🌙 三段式，符合真实作息
- **全链路拖拽**：项目排序、待办改归属、跨时段调度、时段内 reorder 一气呵成
- **乐观更新**：所有交互即时反馈，网络失败自动回滚，不阻塞体验
- **状态双向同步**：任何视图勾选完成，全局立即一致
- **已完成沉底 + 默认折叠**：专注未完成事项，不被历史干扰
- **日期切换**：不只是今天，昨天/明天/任意一天都可切换查看规划

### 技术栈

- **前端**：Next.js 15 (App Router) · React 客户端组件 · TypeScript
- **UI**：Tailwind CSS · 自定义三栏 grid 布局
- **拖拽**：@hello-pangea/dnd
- **后端**：Next.js API Routes · Prisma ORM · SQLite（本地开发） / Turso（线上）
- **部署**：Netlify / Render / Electron（桌面版）

### 数据模型简图

```
Project ─┬─ Task ─── Todo ─┬─ DailyPlanItem (date + timeSlot + order + status)
         │                 │
         └─────────────────┘
```

- `Todo.completed` 与 `DailyPlanItem.status` 通过双向同步保持一致
- `DailyPlanItem.order` 支持同时段内自定义排序
- `Project` 删除时级联清理 Todo 与 DailyPlanItem 引用

---

## 三、近期完整 Commit 历史

```
4e47203  修复今日/计划项与待办完成状态双向同步
f333c88  右栏当日计划支持同时段拖拽排序 + 拖入乐观更新反馈
036a360  左侧项目列表支持 hover 重命名与删除
49a5d85  今日视图支持日期切换：默认今日，可前后切换查看其他日期
2097a72  三栏职责重构：今日视图按时段分组，右栏当日计划仅项目视图显示
fbc750b  支持项目内待办拖拽排序持久化 + 新增全部待办聚合视图
0f2903f  项目已完成项默认折叠 + 今日待办顺延到明日
de77d80  项目/任务重命名 + 任务下快捷加待办 + 勾选划线沉底 + 标签弱化
e11da2b  今日视图可交互（项目聚合/快捷新增/拖拽改时段）+ 共用卡片
7324cfc  迭代三栏可用性：计划纵向精简/今日展示归属/已完成折叠/项目拖拽排序
b541c83  重构为三栏线性布局：项目导航 + 单项目工作区 + 今日计划
```

---


## 四、本轮迭代（基于用户方案落地）

> 依据 `~/Downloads/ActionFlow_下一轮优化方案.md`，聚焦「跨项目找未安排」与「今日页信息层级」两个核心场景。仅前端组件层改动，不动数据模型与 API。

### A. 场景一：全部待办 → 增加「未安排」聚合与快速安排

- **[`AllTodosView.tsx`](src/components/AllTodosView.tsx)** 全量重写
  - 顶部新增 `全部 / 未安排` 二级 Tab
  - 未安排派生：`!todo.completed && !scheduledTodoIds.has(todo.id)`，`scheduledTodoIds` 由 `planItems` 派生（当日已排入的 todoId 集合）
  - 未安排列表按项目分组，行级信息「项目彩色 chip + 分类灰字 + 标题」，右侧「安排 ▾」按钮 hover 显现
  - 快速安排菜单：`今日上午 / 下午 / 晚上` + `明天上午` + `选择日期…`
                                                                                                                                                                            pi/daily-plan { todoId, date, timeSlot }`，成功后 `fetchPlan()`
  - 若安排日期 ≠ 当前 `planDate`，主动补一条乐观 planItem 到 state，避免「未安排」判定滞后
  - 调用处补传 `planItems={planItems}` 与 `onQuickSchedule={handleQuickSchedule}`

### B. 场景二：今日页 → 时段容器化 + 信息层

- **[`page.tsx`](src/app/page.tsx) 今日视图头部结构**：顶部一行 `完成 M/N · 未完成 K`；下一行时段概览 `上午X · 下午Y · 晚上Z`（仅统计未完成，符合方案「让人一眼看到各时段负载」）
  - 每时段独立容器：浅灰头（时段名 + 未完成数 + ＋新增），下方拖拽列表区，底部「› 已完成 N 项」可折叠条带
  - 已完成默认收起，点击才展开；折叠区背景更浅、字体更淡，有明确「归档感」
  - 拖拽 `droppableId=plan-${slot}` 与 draggable id `today-item-${item.id}` 保持不变，兼容 `page.tsx` 的 `handleDragEnd`
  - 拖拽只对 pending 生效，已完成不参与排序
- **[`PlanTaskCard.tsx`](src/components/PlanTaskCard.tsx)** 从卡片改为列表行
  - 外层去掉圆角边框，改为 `border-b border-gray-50` 极浅分割线；hover 时行背景微亮
  - 主标题 `text-[14px] font-medium text-gray-800`（未完成）/ `line-through text-gray-400`（已完成）
  - 次信息：项目名以 `bg-color/10 + color` 彩色 chip 呈现，任务名仅浅灰
  - 顺延 / 移出按钮 `opacity-0 group-hover:opacity-100`，hover 才出现，减少无操作时的视觉噪声

### C. 未实施（明确边界）

按方案「本轮不做」范围，以下均未纳入：今日重点标记、专注/番茄模式、时间容量估算、AI 排期、日终复盘、数据模型改动、时段吸顶（P2）、项目页视觉统一（P1，留待下轮）。

### D. 影响面

- 改动集中在 3 个前端组件 + 1 处 page 集成，无 API/数据库变更
- 拖拽结构、乐观更新链路、完成状态双向同步逻辑均保持不变

---

## 五、本轮修复（基于用户反馈的三处体验问题）· commit `68bb75e`

> 上一轮 P0 落地后，用户在真实使用中反馈三个具体问题：数据不一致、快速安排选项局促、卡片与行样式割裂。本轮全部修复。

### A. 未安排 Tab 数据一致性 Bug（跨日期真值）

- **问题**：PCAI 待办已安排到明天，但「未安排」Tab 里仍然出现
- **根因**：`AllTodosView.scheduledTodoIds` 只根据当日 `planItems` 派生；`fetchPlan` 只查 `?date=${planDate}`；跨日期安排的乐观补丁会在下一次 `fetchPlan` 被覆盖
- **修复**：
  - 新增只读 API [`GET /api/scheduled-todo-ids`](src/app/api/scheduled-todo-ids/route.ts:7)：`SELECT DISTINCT todoId FROM DailyPlanItem WHERE userId=?`，返回该用户所有已被安排（跨日期、跨状态）的 `todoId` 集合
  - [`page.tsx`](src/app/page.tsx) 新增全局 `scheduledIds: Set<string>` state，登录后拉取一次，`handleAddToPlanSlot` / `handleQuickSchedule` / `handleQuickAddToday` 成功后 `.add(todoId)`；`handleRemovePlan` 后重新 `fetchScheduledIds()`（可能完全脱离所有计划）
  - [`AllTodosView`](src/components/AllTodosView.tsx) 接收 `scheduledIds` prop 作为未安排判定真值来源，取代原本从 `planItems` 派生

### B. 快速安排菜单更丰富

- **问题**：菜单里除今日 3 时段外，未来只有「明天上午」一项，太局促
- **修复**：菜单重构为四组分层
  - **今日**：🌅 上午 · ☀️ 下午 · 🌙 晚上（3 列网格）
  - **明日**：🌅 上午 · ☀️ 下午 · 🌙 晚上（3 列网格）
  - **本周**：从后天开始动态生成到本周日的剩余日期，标签形如「周五 · 7/17」，默认落上午
  - **自定义**：`<input type=date>` + `<select>` 时段（上午/下午/晚上）+ 确定按钮

### C. 卡片 / 行样式统一

- **问题**：全部 Tab 沿用旧 `TodoItem` 卡片，未安排 Tab 是新列表行样式，视觉割裂
- **修复**：
  - AllTodosView 弃用 `<TodoItem>`，抽取 `renderTodoRow(todo, opts)` 供全�� Tab 与未安排 Tab 共用
  - 统一列表行：`border-b border-gray-50` + hover 微亮 + 圆形勾选按钮（完成态填充 emerald）
  - **双击标题**进入内联编辑（Enter 保存 / Esc 取消 / blur 自动保存）
  - **hover 显示删除按钮**（二次确认），未完成待办额外显示「安排 ▾」入口
  - 已完成项标题 `line-through text-gray-400`，视觉沉底

### D. 影响面

- 3 个文件：`src/app/api/scheduled-todo-ids/route.ts`（新增）· `src/app/page.tsx`（scheduledIds state + 增量维护）· `src/components/AllTodosView.tsx`（重写）
- `npm run build` 通过，新增路由已注册；未改数据模型

