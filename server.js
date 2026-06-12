import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { askAnswerAgent, getAgentStatus, streamAskAnswerAgent } from './src/agentApi.js'
import { loadEnv } from './src/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

loadEnv(path.join(__dirname, '.env'))

const PORT = Number(process.env.NIRMANA_PORT || 5184)
const PUBLIC_DIR = path.join(__dirname, 'public')
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        agent: getAgentStatus(),
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const body = await readJson(req)
      const question = String(body.question || '').trim()

      if (!question) {
        return sendJson(res, 400, { ok: false, error: '请输入问题。' })
      }

      const result = await askAnswerAgent({
        question,
        userId: body.userId || 'local-browser-user',
      })

      return sendJson(res, 200, {
        ok: true,
        answer: result.answer,
        meta: result.meta,
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/chat-stream') {
      const body = await readJson(req)
      const question = String(body.question || '').trim()

      if (!question) {
        return sendJson(res, 400, { ok: false, error: '请输入问题。' })
      }

      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      })

      try {
        await streamAskAnswerAgent({
          question,
          userId: body.userId || 'local-browser-user',
          onText: async (text) => {
            sendEvent(res, 'delta', { text })
          },
          onMeta: async (meta) => {
            sendEvent(res, 'meta', meta)
          },
        })

        sendEvent(res, 'done', { ok: true })
        return res.end()
      } catch (error) {
        sendEvent(res, 'error', {
          error: error.message || 'Stream failed',
        })
        return res.end()
      }
    }

    if (req.method === 'GET') {
      return serveStatic(url.pathname, res)
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error.message || 'Server error',
    })
  }
})

server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_SECONDS || 180) * 1000

server.listen(PORT, () => {
  console.log(`Nirmana running at http://localhost:${PORT}`)
})

function serveStatic(urlPath, res) {
  const safePath = urlPath === '/' ? '/index.html' : urlPath
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath))

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { ok: false, error: 'Forbidden' })
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      return sendJson(res, 404, { ok: false, error: 'Not found' })
    }

    res.writeHead(200, { 'content-type': getContentType(filePath) })
    res.end(content)
  })
}

function getContentType(filePath) {
  const ext = path.extname(filePath)
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  }

  return types[ext] || 'application/octet-stream'
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''

    req.on('data', (chunk) => {
      raw += chunk

      if (raw.length > 1_000_000) {
        req.destroy()
        reject(new Error('Request body too large.'))
      }
    })

    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('Invalid JSON body.'))
      }
    })

    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.writeHead(status, JSON_HEADERS)
  res.end(JSON.stringify(payload))
}

function sendEvent(res, event, payload) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}
