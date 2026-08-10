# 校园记账软件 — 系统架构文档

## 一、项目概述

一款面向大学生的轻量记账工具，核心定位：**"3 秒记一笔，30 秒看明白钱去哪了"**。支持多账户管理、预算控制、数据可视化，兼顾离线记账与云端同步。

---

## 二、整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                       前端（App/Web）                         │
│   记账页  账单列表  数据看板  预算管理  账户管理  个人中心     │
│   本地缓存（SQLite / IndexedDB）    离线同步队列              │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP/WebSocket (JSON)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                       后端 API 层                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │用户  │ │记账  │ │预算  │ │统计  │ │导出  │            │
│  │服务  │ │服务  │ │服务  │ │服务  │ │服务  │            │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘            │
│     └────────┴────────┴────────┴────────┴────────┘         │
│                    缓存层（Redis，可选）                      │
└──────────────────────┬───────────────────────────────────────┘
                       │ ORM / SQL
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    数据库（MySQL / SQLite）                   │
│  users  accounts  categories  transactions  budgets          │
│  budget_records  sync_queue  notifications                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 三、前端职责

负责用户交互与界面展示，主要模块如下：

| 模块 | 职责 |
|------|------|
| 记账模块 | 快速记账页、分类选择器、金额输入器、日期选择器、拍照入口 |
| 账单展示 | 日/周/月账单列表、筛选/搜索、详情查看 |
| 数据看板 | 月度概览卡片、分类饼图/环形图、趋势折线图、支出排行 |
| 预算管理 | 预算设置页（按月/周/分类）、预算进度条、超支预警弹窗 |
| 账户管理 | 账户列表（微信/支付宝/饭卡/现金）、余额调整 |
| 个人中心 | 月生活费设置、到账日设置、提醒开关、主题切换、数据导出 |
| 通用组件 | 登录/注册、密码/指纹锁、无网络时的本地缓存队列 |

### 离线策略

- 本地维护一份 SQLite 或 IndexedDB，用于离线记账
- 网络恢复后通过 `sync_queue` 机制逐条同步到后端，保证数据不丢失

---

## 四、后端职责

负责业务逻辑处理与数据接口提供：

| 服务模块 | 功能 |
|----------|------|
| 用户服务 | 注册/登录、Token 鉴权、密码加密、指纹绑定 |
| 记账服务 | 新增/编辑/删除账单、账单查询（按日/周/月/分类）、批量操作 |
| 预算服务 | 预算设置、预算进度计算、超支判定、预警推送 |
| 统计分析服务 | 月度收支汇总、分类占比计算、环比对比、趋势数据生成 |
| 账户服务 | 账户余额管理、余额变动记录 |
| 提醒服务 | 生活费到账提醒、预算超支提醒、定时任务调度 |
| 数据导出服务 | 生成 Excel/CSV 报表、按时间段导出 |
| 文件服务 | 记账图片上传/存储/访问 |

### 可选增强

- **缓存层**：统计类数据（月度概览、分类占比）可使用 Redis 缓存，减少数据库查询压力
- **推送服务**：可接入极光推送 / 微信模板消息，实现主动提醒

---

## 五、数据库设计

### 5.1 表结构总览

| 表名 | 说明 |
|------|------|
| `users` | 用户基础信息 + 生活费配置 |
| `accounts` | 多账户管理（微信/支付宝/饭卡/现金） |
| `categories` | 收支分类（内置分类 + 用户自定义） |
| `transactions` | **核心表**，记录每一笔收支明细 |
| `budgets` | 预算设置（按分类/周期） |
| `budget_records` | 预算执行快照，避免每次实时计算 |
| `sync_queue` | 离线操作同步队列 |
| `notifications` | 推送消息记录 |

### 5.2 核心字段说明

#### users

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT / UUID | 主键 |
| nickname | VARCHAR | 昵称 |
| phone | VARCHAR | 手机号 |
| password_hash | VARCHAR | 密码哈希 |
| monthly_income | DECIMAL | 月生活费金额 |
| allowance_day | INT | 生活费到账日（如每月5号） |
| created_at | DATETIME | 注册时间 |

#### transactions（核心表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT / UUID | 主键 |
| user_id | INT | 用户ID（外键） |
| account_id | INT | 账户ID（外键，关联 accounts） |
| category_id | INT | 分类ID（外键，关联 categories） |
| amount | DECIMAL | 金额 |
| type | ENUM | income / expense |
| note | TEXT | 备注 |
| date | DATE | 消费日期 |
| image_url | VARCHAR | 小票图片（可选） |
| created_at | DATETIME | 记录创建时间 |

#### budgets

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT / UUID | 主键 |
| user_id | INT | 用户ID |
| category_id | INT | 分类ID（NULL 表示总预算） |
| amount | DECIMAL | 预算金额 |
| period | ENUM | weekly / monthly |
| start_date | DATE | 周期开始日期 |
| end_date | DATE | 周期结束日期 |

---

## 六、核心数据流

### 6.1 记账流程

```
用户填写金额+分类 → 前端校验 → 写入本地数据库
                                    ↓
                              有网络？──→ 是 → 调用后端 API → 写入 MySQL
                                  │
                                  否
                                  │
                                  ▼
                          存入 sync_queue（待同步）
                          网络恢复后自动逐条同步
```

### 6.2 预算预警流程

```
用户设置月预算 1500 元
       ↓
每笔支出记账后，后端计算：(当月已支出 / 预算) × 100%
       ↓
   达到阈值？──→ 80%  → 推送"接近预算上限"提醒
       │         90%  → 推送"即将超支"提醒
       │        100%  → 推送"已超支"提醒
       ▼
        正常状态，不推送
```

### 6.3 生活费到账提醒流程

```
每月 allowance_day 当天
       ↓
定时任务扫描所有用户
       ↓
   推送"本月生活费已到账，共 XX 元"消息
       ↓
自动重置当月预算（可选）
```

---

## 七、技术选型建议

| 层级 | 推荐技术 | 说明 |
|------|----------|------|
| 前端框架 | React Native / Flutter / UniApp | 一套代码跨 iOS + Android |
| 状态管理 | Redux / Zustand / Pinia | 管理全局状态 |
| 本地存储 | SQLite / AsyncStorage | 离线缓存 |
| 图表库 | ECharts / AntV / Chart.js | 数据可视化 |
| 后端框架 | Node.js (Express/Koa) / Go (Gin) / Python (FastAPI) | 按团队熟悉度选择 |
| 数据库 | MySQL（线上）+ SQLite（本地） | 关系型，适合财务数据 |
| 缓存 | Redis（可选） | 统计结果缓存 |
| 鉴权 | JWT | 无状态 Token |
| 部署 | 云服务器 + Docker / 云函数（Serverless） | 按预算选择 |

---

## 八、功能优先级建议（MVP）

| 优先级 | 功能 |
|--------|------|
| P0（必须） | 快速记账、账单列表、基础分类、月度概览 |
| P1（核心） | 多账户管理、预算设置与预警、数据看板（图表） |
| P2（增强） | 数据导出、离线记账、同步 |
| P3（锦上添花） | 拍照记账、指纹锁、提醒推送、主题切换 |

---

## 九、不适用的功能（避免过度设计）

- ❌ 复杂的投资理财模块
- ❌ 信用卡账单管理
- ❌ 发票扫描与税务相关
- ❌ 社交 / 社区功能

---

## 十、项目文件结构

```
bill-splitter/
│
├── frontend/                          # 前端项目
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home/                  # 首页 / 快速记账
│   │   │   ├── Bills/                 # 账单列表
│   │   │   ├── Dashboard/             # 数据看板（图表统计）
│   │   │   ├── Budget/                # 预算管理
│   │   │   ├── Accounts/              # 账户管理
│   │   │   ├── Profile/               # 个人中心
│   │   │   └── Auth/                  # 登录 / 注册
│   │   ├── components/                # 通用可复用组件
│   │   ├── services/                  # API 请求封装
│   │   ├── stores/                    # 全局状态管理
│   │   ├── utils/                     # 工具函数
│   │   ├── hooks/                     # 自定义 Hooks
│   │   ├── router/                    # 路由配置
│   │   └── assets/                    # 静态资源（图片、图标等）
│   ├── static/                        # 公共静态资源
│   └── package.json
│
├── backend/                           # 后端项目
│   ├── src/
│   │   ├── controllers/               # 控制器层（处理请求）
│   │   │   ├── authController.js      # 登录注册
│   │   │   ├── transactionController.js # 记账
│   │   │   ├── budgetController.js    # 预算
│   │   │   ├── accountController.js   # 账户
│   │   │   ├── statisticsController.js # 统计
│   │   │   └── exportController.js    # 数据导出
│   │   ├── services/                  # 业务逻辑层
│   │   │   ├── authService.js
│   │   │   ├── transactionService.js
│   │   │   ├── budgetService.js
│   │   │   ├── accountService.js
│   │   │   ├── statisticsService.js
│   │   │   ├── exportService.js
│   │   │   └── reminderService.js     # 提醒服务
│   │   ├── models/                    # 数据模型 / ORM
│   │   │   ├── User.js
│   │   │   ├── Transaction.js
│   │   │   ├── Category.js
│   │   │   ├── Account.js
│   │   │   ├── Budget.js
│   │   │   └── Notification.js
│   │   ├── middleware/                # 中间件（鉴权、日志等）
│   │   ├── routes/                    # 路由注册
│   │   ├── utils/                     # 工具函数
│   │   ├── config/                    # 配置文件
│   │   └── app.js                     # 入口文件
│   └── package.json
│
├── database/                          # 数据库
│   ├── migrations/                    # 数据库迁移文件
│   ├── seeds/                         # 种子数据（内置分类等）
│   └── schema.sql                     # 完整建表 SQL
│
├── docs/                              # 文档
│   └── api.md                         # API 接口文档
│
└── README.md                          # 本文件
```