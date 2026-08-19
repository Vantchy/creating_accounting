# 树洞留言墙

一个简单的共享留言墙，基于 Python + Flask，所有数据存储在本地 JSON 文件中。

## 项目结构

```
class/
├── app.py              # 应用入口，创建 Flask 应用并启动
├── config.py           # 配置文件（端口、数据路径等）
├── db.py               # 数据层，读写 data/cards.json
├── routes.py           # 路由层，定义页面和 API 接口
├── templates/
│   └── index.html      # 前端页面
├── static/
│   ├── style.css       # 样式
│   └── script.js       # 前端逻辑
├── data/
│   └── cards.json      # 留言数据（运行后自动生成）
├── reference/
│   └── 前端风格指南.md  # 设计参考
├── requirements.txt    # 依赖列表
└── README.md
```

## 快速开始

1. 创建虚拟环境（推荐）：
   ```
   python -m venv venv
   venv\Scripts\activate
   ```

2. 安装依赖：
   ```
   pip install -r requirements.txt
   ```

3. 启动服务器：
   ```
   python app.py
   ```

4. 浏览器访问 `http://127.0.0.1:5000`

## API 接口

| 方法 | 地址 | 说明 |
|------|------|------|
| GET | `/api/cards` | 获取所有留言 |
| POST | `/api/cards` | 新增留言（body: `{"text":"...","owner":"..."}`） |
| DELETE | `/api/cards/<id>?owner=...` | 删除自己的留言 |

## 修改配置

编辑 `config.py` 即可修改端口、调试模式等。