const DEFAULT_AUTH_HEADER = 'Authorization'
const DEFAULT_AUTH_PREFIX = 'Bearer'
const DEFAULT_COZE_BASE_URL = 'https://api.coze.com'

export function getAgentStatus() {
  if (process.env.NIRMANA_API_URL) {
    return {
      provider: 'generic-ask-answer-api',
      configured: true,
      endpoint: redactUrl(process.env.NIRMANA_API_URL),
    }
  }

  if (getCozeApiKey() && process.env.COZE_BOT_ID) {
    return {
      provider: 'coze',
      configured: true,
      endpoint: redactUrl(getCozeBaseUrl()),
    }
  }

  return {
    provider: 'unconfigured',
    configured: false,
    endpoint: '',
  }
}

export async function askAnswerAgent({ question, userId }) {
  if (process.env.NIRMANA_API_URL) {
    const response = await callAskAnswerApi({ question, userId })

    return {
      answer: extractAnswer(response) || '响应解析完成：未定位可展示的培养方案文本。请校验回答字段路径，并确保输出包含《九宫格结构人才培养方案》与《毕业要求-课程支撑矩阵表》。',
      meta: {
        mode: 'api',
        endpoint: redactUrl(process.env.NIRMANA_API_URL),
      },
    }
  }

  const cozeApiKey = getCozeApiKey()
  if (cozeApiKey && process.env.COZE_BOT_ID) {
    return askCozeV3({
      question,
      userId,
      apiKey: cozeApiKey,
      botId: process.env.COZE_BOT_ID,
      baseUrl: getCozeBaseUrl(),
    })
  }

  return {
    answer:
      '系统引擎待装填。当前本地链路已就绪；请配置 NIRMANA_* 通用接口参数，或沿用 COZE_API_KEY/COZE_BOT_ID。配置完成后，系统将按“产业 ➔ 定位、胜任力 ➔ 要求、职责 ➔ 目标、课程 ➔ 能力”四大映射生成《九宫格结构人才培养方案》与《毕业要求-课程支撑矩阵表》。',
    meta: {
      mode: 'placeholder',
    },
  }
}

export async function streamAskAnswerAgent({ question, userId, onText, onMeta }) {
  if (process.env.NIRMANA_API_URL) {
    const result = await askAnswerAgent({ question, userId })
    const chunks = chunkText(result.answer)

    for (const chunk of chunks) {
      await onText(chunk)
      await delay(18)
    }

    await onMeta(result.meta)
    return
  }

  const cozeApiKey = getCozeApiKey()
  if (cozeApiKey && process.env.COZE_BOT_ID) {
    await streamCozeV3({
      question,
      userId,
      apiKey: cozeApiKey,
      botId: process.env.COZE_BOT_ID,
      baseUrl: getCozeBaseUrl(),
      onText,
      onMeta,
    })
    return
  }

  const result = await askAnswerAgent({ question, userId })
  await onText(result.answer)
  await onMeta(result.meta)
}

async function askCozeV3({ question, userId, apiKey, botId, baseUrl }) {
  const chat = await cozeRequest({
    apiKey,
    baseUrl,
    endpoint: '/v3/chat',
    method: 'POST',
    body: {
      bot_id: botId,
      user_id: userId,
      stream: false,
      additional_messages: [
        {
          role: 'user',
          content: question,
          content_type: 'text',
        },
      ],
    },
  })

  const chatData = chat.data || chat
  const chatId = chatData.id
  const conversationId = chatData.conversation_id

  if (!chatId || !conversationId) {
    throw new Error(`Coze did not return chat id/conversation id: ${JSON.stringify(chat)}`)
  }

  const finalChat = await waitForCozeCompletion({
    apiKey,
    baseUrl,
    chatId,
    conversationId,
  })

  const messages = await cozeRequest({
    apiKey,
    baseUrl,
    endpoint:
      `/v3/chat/message/list?conversation_id=${encodeURIComponent(conversationId)}`
      + `&chat_id=${encodeURIComponent(chatId)}`,
    method: 'GET',
  })

  return {
    answer: extractCozeAnswer(messages) || '响应解析完成：未定位可展示的培养方案文本。请校验智能体输出是否包含标准方案正文。',
    meta: {
      mode: 'coze-v3',
      chatId,
      conversationId,
      status: finalChat.status,
    },
  }
}

async function streamCozeV3({ question, userId, apiKey, botId, baseUrl, onText, onMeta }) {
  const response = await fetch(`${baseUrl}/v3/chat`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      bot_id: botId,
      user_id: userId,
      stream: true,
      additional_messages: [
        {
          role: 'user',
          content: question,
          content_type: 'text',
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`生成引擎流式接口异常：${text || response.statusText}`)
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let chatMeta = null
  let answerText = ''

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true })
    const events = buffer.split(/\n\n|\r\n\r\n/)
    buffer = events.pop() || ''

    for (const rawEvent of events) {
      const event = parseSseEvent(rawEvent)
      if (!event.data || event.data === '[DONE]') {
        continue
      }

      const payload = safeJsonParse(event.data)
      if (!payload) {
        continue
      }

      const data = payload.data || payload
      const type = data.type || payload.type
      const content = data.content || payload.content || ''

      if (data.conversation_id || data.chat_id || data.id) {
        chatMeta = {
          mode: 'coze-v3-stream',
          conversationId: data.conversation_id || chatMeta?.conversationId,
          chatId: data.chat_id || data.id || chatMeta?.chatId,
          status: data.status || chatMeta?.status,
        }
      }

      if (type === 'answer' && content) {
        const delta = getAnswerDelta(answerText, content)

        if (delta) {
          answerText += delta
          await onText(delta)
        }
      }
    }
  }

  if (buffer.trim()) {
    const event = parseSseEvent(buffer)
    const payload = safeJsonParse(event.data)
    const data = payload?.data || payload
    const content = data?.content || payload?.content

    if ((data?.type || payload?.type) === 'answer' && content) {
      const delta = getAnswerDelta(answerText, content)

      if (delta) {
        await onText(delta)
      }
    }
  }

  await onMeta(chatMeta || { mode: 'coze-v3-stream' })
}

async function waitForCozeCompletion({ apiKey, baseUrl, chatId, conversationId }) {
  const intervalMs = readPositiveNumber(process.env.COZE_POLL_INTERVAL_MS, 1000)
  const timeoutSeconds = readPositiveNumber(process.env.COZE_TIMEOUT_SECONDS, 180)
  const attemptsFromTimeout = Math.ceil((timeoutSeconds * 1000) / intervalMs)
  const configuredMaxAttempts = Number(process.env.COZE_MAX_POLL_ATTEMPTS)
  const maxAttempts = Number.isFinite(configuredMaxAttempts) && configuredMaxAttempts > 0
    ? Math.max(configuredMaxAttempts, attemptsFromTimeout)
    : attemptsFromTimeout

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await cozeRequest({
      apiKey,
      baseUrl,
      endpoint:
        `/v3/chat/retrieve?conversation_id=${encodeURIComponent(conversationId)}`
        + `&chat_id=${encodeURIComponent(chatId)}`,
      method: 'GET',
    })
    const data = response.data || response
    const status = data.status

    if (status === 'completed') {
      return data
    }

    if (status === 'failed' || status === 'canceled') {
      const reason = data.last_error?.msg || data.last_error?.message || status
      throw new Error(`生成任务状态异常：${status}；原因：${reason}`)
    }

    await delay(intervalMs)
  }

  throw new Error(
    `生成任务超时：约 ${Math.round((maxAttempts * intervalMs) / 1000)} 秒内未完成能力评价标准矩阵生成。`
  )
}

async function cozeRequest({ apiKey, baseUrl, endpoint, method, body }) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok || (data.code && data.code !== 0)) {
    const message = data.msg || data.message || response.statusText
    throw new Error(`生成引擎接口异常：${message}`)
  }

  return data
}

function extractCozeAnswer(payload) {
  const messages = Array.isArray(payload.data) ? payload.data : []

  return messages
    .filter((item) => item.type === 'answer')
    .map((item) => item.content)
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function getCozeBaseUrl() {
  return (process.env.COZE_BASE_URL || DEFAULT_COZE_BASE_URL).replace(/\/$/, '')
}

function getCozeApiKey() {
  return process.env.COZE_API_KEY || process.env.COZE_API_TOKEN
}

function parseSseEvent(rawEvent) {
  const event = { event: '', data: '' }

  for (const line of rawEvent.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event.event = line.slice(6).trim()
    }

    if (line.startsWith('data:')) {
      event.data += line.slice(5).trim()
    }
  }

  return event
}

function getAnswerDelta(currentAnswer, incomingContent) {
  if (!currentAnswer) {
    return incomingContent
  }

  if (incomingContent === currentAnswer) {
    return ''
  }

  if (incomingContent.startsWith(currentAnswer)) {
    return incomingContent.slice(currentAnswer.length)
  }

  return incomingContent
}

async function callAskAnswerApi({ question, userId }) {
  const controller = new AbortController()
  const timeoutSeconds = readPositiveNumber(process.env.NIRMANA_API_TIMEOUT_SECONDS, 120)
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000)

  try {
    const response = await fetch(process.env.NIRMANA_API_URL, {
      method: process.env.NIRMANA_API_METHOD || 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(buildRequestBody({ question, userId })),
      signal: controller.signal,
    })

    const text = await response.text()
    const data = text ? safeJsonParse(text) : {}

    if (!response.ok) {
      const message = data?.error || data?.message || text || response.statusText
      throw new Error(`培养方案生成接口异常：${message}`)
    }

    return data || { answer: text }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`生成任务超时：${timeoutSeconds} 秒内未完成产业基准数据映射。`)
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function buildHeaders() {
  const headers = {
    'content-type': 'application/json',
  }

  const apiKey = process.env.NIRMANA_API_KEY
  if (!apiKey) {
    return headers
  }

  const authHeader = process.env.NIRMANA_AUTH_HEADER || DEFAULT_AUTH_HEADER
  const authPrefix = process.env.NIRMANA_AUTH_PREFIX ?? DEFAULT_AUTH_PREFIX
  headers[authHeader] = authPrefix ? `${authPrefix} ${apiKey}` : apiKey

  return headers
}

function buildRequestBody({ question, userId }) {
  const questionField = process.env.NIRMANA_REQUEST_QUESTION_FIELD || 'question'
  const extra = safeJsonParse(process.env.NIRMANA_API_EXTRA_JSON || '{}') || {}

  return {
    ...extra,
    [questionField]: question,
    user_id: userId,
  }
}

function extractAnswer(payload) {
  const configuredPath = process.env.NIRMANA_RESPONSE_ANSWER_PATH || 'answer'
  const answer = readPath(payload, configuredPath)

  if (typeof answer === 'string') {
    return answer.trim()
  }

  if (answer != null) {
    return JSON.stringify(answer, null, 2)
  }

  const fallbacks = [
    'answer',
    'data.answer',
    'message',
    'data.message',
    'result',
    'data.result',
    'choices.0.message.content',
    'choices.0.text',
  ]

  for (const path of fallbacks) {
    const value = readPath(payload, path)

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function readPath(value, path) {
  return path.split('.').reduce((current, key) => {
    if (current == null) {
      return undefined
    }

    if (Array.isArray(current) && /^\d+$/.test(key)) {
      return current[Number(key)]
    }

    return current[key]
  }, value)
}

function chunkText(text) {
  if (text.length <= 120) {
    return [text]
  }

  return text.match(/[\s\S]{1,90}/g) || [text]
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function readPositiveNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function redactUrl(url) {
  if (!url) {
    return ''
  }

  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return '[configured]'
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
