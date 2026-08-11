# 校园记账软件

一款面向大学生的轻量记账工具，支持多账户管理、预算控制、月度统计和数据导出。

---

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript
- **后端**：Node.js + Express
- **数据库**：SQLite（通过 sql.js 在内存中运行）
- **鉴权**：JWT + bcryptjs

---

## 目录结构

```
.
├── backend/              # Express 后端
│   └── src/
│       ├── app.js        # 服务入口
│       ├── config/       # 配置
│       ├── controllers/  # 控制器
│       ├── models/       # 数据模型
│       ├── routes/       # 路由
│       ├── services/     # 业务逻辑
│       └── utils/        # 工具函数
├── frontend/             # 前端页面
│   ├── index.html
│   ├── css/
│   └── js/
└── serve-frontend.js     # 前端静态文件服务器
```

---

## 本地运行

### 1. 启动后端

```bash
cd backend
npm install
node src/app.js
```

后端默认运行在 `http://localhost:3000`。

### 2. 启动前端

在项目根目录新开一个终端：

```bash
node serve-frontend.js
```

前端默认运行在 `http://localhost:8080`。

打开浏览器访问 `http://localhost:8080` 即可使用。

---

## 主要功能

- 用户注册 / 登录
- 快速记账（收入 / 支出）
- 多账户管理（微信、支付宝、饭卡、现金等）
- 分类管理
- 预算设置与进度查看
- 月度收支统计、分类占比、趋势图表
- 数据导出 CSV
- 数据重置

---

## API 说明

后端 API 基础路径：`http://localhost:3000/api`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册 |
| `/api/auth/login` | POST | 登录 |
| `/api/transactions` | GET/POST | 交易记录列表 / 新增 |
| `/api/accounts` | GET/POST | 账户列表 / 新增 |
| `/api/budgets` | GET/POST | 预算列表 / 新增 |
| `/api/statistics/monthly` | GET | 月度统计 |
| `/api/export/csv` | GET | 导出 CSV |
| `/api/reset` | POST | 重置当前用户数据 |

完整路由定义见 `backend/src/routes/index.js`。

---

## 注意事项

- 当前使用文件型 SQLite（`backend/database/data.db`），**后端重启后数据不会丢失**。
- 数据库文件不会提交到 Git，保留在本地。
