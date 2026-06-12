# Gemini Design Brief for Nirmana

请你负责继续美化 `public/index.html`，但不要改变本地 API 调用逻辑。

## 项目定位

- 项目名：Nirmana
- 当前核心页面：智能体3：人才培养方案
- 角色定位：培养方案设计专家
- 系统职责：作为承上启下的枢纽，连接产业需求、胜任力模型、岗位职责与实际教学安排
- 第一屏必须直接是可用工作台，不要做营销落地页

## 业务逻辑

后续任何 placeholder、mock data、按钮文案、状态提示、模拟输出都必须遵守以下逻辑。

四大映射：

- 产业 ➔ 定位
- 胜任力 ➔ 要求
- 职责 ➔ 目标
- 课程 ➔ 能力

标准产出物：

- 《九宫格结构人才培养方案》
- 《毕业要求-课程支撑矩阵表》

文案语调：

- 禁止使用“你好，我是一个 AI，很高兴为你服务”等拟人化、轻佻表达
- 使用专业、冰冷、精准的指令式语言
- 可使用：“系统引擎已就绪”“正在解构核心胜任力模型”“产业基准数据映射完成”“正在生成能力评价标准矩阵”

## 必须保留的接口

- `GET /api/health`
- `POST /api/chat`
- `POST /api/chat-stream`

## 必须保留的 HTML id

- `#form`
- `#question`
- `#send`
- `#messages`
- `#status`
- `#message-count`
- `#new-chat`

## 必须保留的主要 class

- `.app`
- `.sidebar`
- `.main`
- `.topbar`
- `.brand`
- `.status`
- `.chat`
- `.messages`
- `.message`
- `.message.user`
- `.message.agent`
- `.label`
- `.bubble`
- `.composer-wrap`
- `.composer`
- `.empty`
- `.context-panel`

## 视觉规范

- 核心配色：极深墨色背景，接近 `#050505`
- 强调色：核心高亮、交互焦点、重要边框统一使用 `#F7C600`
- 质感：高对比度深色工业界面，像高级数据监测终端或早期工业级系统
- 排版：现代、紧凑、克制、高信息密度
- 边框：多用明确的 1px 深色边框线，例如 `#111`、`gray-800`
- 圆角：控制在 2px-4px
- 禁止：大圆角、毛玻璃、高斯模糊、柔和彩色投影、通用 SaaS 浅色卡片风格

## 不要改的内容

- 不要删除或改名上述 id/class
- 不要改 `fetch('/api/health')`
- 不要改 `fetch('/api/chat-stream')`
- 不要把页面改成 React/Vue
- 不要引入需要构建步骤的依赖
- 不要添加数据库、登录、文件上传等额外功能

请输出完整的 `public/index.html` 文件内容。
