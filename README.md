# Nirmana

Nirmana 是 Lastiara 的轻量复制版：它不接数据库，只把用户问题转发给一个给定的 ask-and-answer API，然后把回答展示在本地网页里。

## 运行

```bash
cd /Users/apple/hajime/nirmana
npm run dev
```

打开：

```text
http://localhost:5184
```

## API 流程

```text
Browser
  -> POST /api/chat-stream { question }
  -> server.js
  -> src/agentApi.js
  -> given ask-and-answer API
  -> answer
  -> Browser renders answer
```

## 配置

复制 `.env.example` 为 `.env`，至少填写：

```env
NIRMANA_API_URL=https://example.com/api/ask
NIRMANA_API_KEY=your_api_key
NIRMANA_RESPONSE_ANSWER_PATH=answer
NIRMANA_PORT=5184
```

如果 API 的请求字段不是 `question`，修改：

```env
NIRMANA_REQUEST_QUESTION_FIELD=你的字段名
```

如果 API 返回结构是：

```json
{
  "data": {
    "answer": "..."
  }
}
```

就设置：

```env
NIRMANA_RESPONSE_ANSWER_PATH=data.answer
```

特殊请求结构只需要改 [src/agentApi.js](/Users/apple/hajime/nirmana/src/agentApi.js)。
