# Nirmana

Nirmana 是一个本地运行的知识管理工作台原型。当前版本围绕“人才培养方案生成”场景，提供登录、对话生成、历史记录和基础用量统计。

项目保持轻量实现：Node.js 原生 HTTP 服务 + 单页 HTML。没有前端构建步骤。

## 功能概览

- Supabase 邮箱密码登录。
- 调用通用问答 API 或 Coze v3 生成回答。
- 支持流式输出到前端界面。
- 保存用户问题、回答、状态和响应时间。
- 提供历史记录查看与删除。
- 提供简单 dashboard：总查询量、今日查询量、平均响应时间、活跃用户、活跃部门和 7 日趋势。
- 内置 Coze Knowledge 素材目录，可单独上传到知识库。

## 项目结构

```text
nirmana/
  public/index.html                  # 前端页面，无构建步骤
  server.js                          # HTTP 服务、路由、静态文件服务
  src/
    agentApi.js                      # 通用 API / Coze 调用逻辑
    env.js                           # .env 解析
    supabaseClient.js                # Supabase auth、profile、chat_records 操作
  coze_talent_knowledge_base/        # 可上传到 Coze Knowledge 的 Markdown 素材
  docs/                              # 设计参考和原型参考，不参与运行
  .env.example                       # 生成接口配置样例
  .env.supa.example                  # Supabase 配置样例
```

## 环境要求

- Node.js `>=20.19.0`
- npm
- Supabase 项目
- 一个回答生成接口：
  - 通用 ask-and-answer API，或
  - Coze v3 bot

## 安装

```bash
npm install
```

## 配置

复制环境文件：

```bash
cp .env.example .env
cp .env.supa.example .env.supa
```

### 生成接口

通用 API：

```env
NIRMANA_API_URL=https://example.com/api/ask
NIRMANA_API_KEY=your_api_key
NIRMANA_RESPONSE_ANSWER_PATH=answer
```

如果返回结构是：

```json
{
  "data": {
    "answer": "..."
  }
}
```

则设置：

```env
NIRMANA_RESPONSE_ANSWER_PATH=data.answer
```

Coze v3：

```env
COZE_BASE_URL=https://api.coze.com
COZE_API_KEY=your_coze_api_key
COZE_BOT_ID=your_bot_id
```

如果同时配置了 `NIRMANA_API_URL` 和 Coze，服务会优先使用通用 API。

### Supabase

`.env.supa` 至少需要：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_or_publishable_key
```

服务端会读取两张表：

- `profiles`
- `chat_records`

可参考 [docs/supabase-schema.sql](docs/supabase-schema.sql) 建表。实际权限策略应按部署环境调整。

## 运行

```bash
npm run dev
```

默认地址：

```text
http://localhost:5184
```

健康检查：

```bash
curl http://localhost:5184/api/health
```

## 可用脚本

```bash
npm run dev      # 本地开发
npm start        # 同 dev，便于部署平台识别
npm run check    # Node 语法检查
```

## API 路由

```text
GET    /api/health
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/me
POST   /api/chat
POST   /api/chat-stream
GET    /api/history
DELETE /api/history/:id
GET    /api/dashboard
```

## 上传前检查

```bash
npm run check
git status --short
```

确认以下文件不会上传：

- `.env`
- `.env.supa`
- `node_modules/`
- `.claude/`

`package-lock.json` 应随项目提交，便于复现依赖版本。

## 备注

- `docs/` 中是设计和参考材料，不参与运行。
- `coze_talent_knowledge_base/` 是知识库素材，不是前端或服务端依赖。
- 本项目目前使用浏览器 `sessionStorage` 保存 Supabase session；生产环境需要按安全要求进一步加固。
