import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { askAnswerAgent, getAgentStatus, streamAskAnswerAgent } from './src/agentApi.js'
import { loadEnv } from './src/env.js'
import {
  getAuthenticatedContext,
  getSupabaseClient,
  getSupabaseStatus,
  insertChatRecord,
  loadSupabaseEnv,
  readProfile,
  refreshAuthSession,
  signInWithPassword,
  signOutSession,
} from './src/supabaseClient.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

loadEnv(path.join(__dirname, '.env'))
loadSupabaseEnv(path.join(__dirname, '.env.supa'))

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
        supabase: getSupabaseStatus(),
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJson(req)
      const email = String(body.email || '').trim()
      const password = String(body.password || '')

      if (!email || !password) {
        return sendJson(res, 400, { ok: false, error: '请输入邮箱和密码。' })
      }

      const authData = await signInWithPassword({ email, password })
      const accessToken = authData.session?.access_token
      const profile = accessToken
        ? await readProfile(getSupabaseClient(accessToken), authData.user.id)
        : null

      return sendJson(res, 200, {
        ok: true,
        session: authData.session,
        user: authData.user,
        profile,
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/refresh') {
      const body = await readJson(req)
      const refreshToken = String(body.refreshToken || '')

      if (!refreshToken) {
        return sendJson(res, 400, { ok: false, error: '缺少 refresh token。' })
      }

      const authData = await refreshAuthSession(refreshToken)
      const accessToken = authData.session?.access_token
      const profile = accessToken && authData.user?.id
        ? await readProfile(getSupabaseClient(accessToken), authData.user.id)
        : null

      return sendJson(res, 200, {
        ok: true,
        session: authData.session,
        user: authData.user,
        profile,
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const auth = await getAuthenticatedContext(req)
      await signOutSession(auth.accessToken)
      return sendJson(res, 200, { ok: true })
    }

    if (req.method === 'GET' && url.pathname === '/api/me') {
      const auth = await getAuthenticatedContext(req)
      const profile = await readProfile(auth.supabase, auth.user.id)

      return sendJson(res, 200, {
        ok: true,
        user: auth.user,
        profile,
      })
    }

    if (req.method === 'GET' && url.pathname === '/api/history') {
      const auth = await getAuthenticatedContext(req)
      const sort = url.searchParams.get('sort') === 'asc' ? 'asc' : 'desc'
      const records = await listChatRecords(auth.supabase, auth.user.id, sort)

      return sendJson(res, 200, {
        ok: true,
        records,
      })
    }

    const historyDeleteMatch = /^\/api\/history\/([^/]+)$/.exec(url.pathname)
    if (req.method === 'DELETE' && historyDeleteMatch) {
      const auth = await getAuthenticatedContext(req)
      const id = decodeURIComponent(historyDeleteMatch[1])
      await deleteChatRecord(auth.supabase, auth.user.id, id)

      return sendJson(res, 200, { ok: true })
    }

    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      const auth = await getAuthenticatedContext(req)
      const profile = await readProfile(auth.supabase, auth.user.id)
      assertDashboardAccess(profile)
      const [records, profiles] = await Promise.all([
        listDashboardRecords(auth.supabase),
        listDashboardProfiles(auth.supabase),
      ])

      return sendJson(res, 200, {
        ok: true,
        stats: buildDashboardStats(records, profiles),
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const auth = await getAuthenticatedContext(req)
      const body = await readJson(req)
      const question = String(body.question || '').trim()

      if (!question) {
        return sendJson(res, 400, { ok: false, error: '请输入问题。' })
      }

      const startedAt = Date.now()
      const result = await askAnswerAgent({
        question,
        userId: auth.user.id,
      })
      const responseTimeMs = Date.now() - startedAt

      await insertChatRecord(auth.supabase, {
        user_id: auth.user.id,
        question,
        answer: result.answer,
        status: 'success',
        response_time_ms: responseTimeMs,
      })

      return sendJson(res, 200, {
        ok: true,
        answer: result.answer,
        meta: result.meta,
        responseTimeMs,
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/chat-stream') {
      const auth = await getAuthenticatedContext(req)
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
        const startedAt = Date.now()
        let answer = ''

        await streamAskAnswerAgent({
          question,
          userId: auth.user.id,
          onText: async (text) => {
            answer += text || ''
            sendEvent(res, 'delta', { text })
          },
          onMeta: async (meta) => {
            sendEvent(res, 'meta', meta)
          },
        })

        const responseTimeMs = Date.now() - startedAt
        const record = await insertChatRecord(auth.supabase, {
          user_id: auth.user.id,
          question,
          answer: answer.trim(),
          status: 'success',
          response_time_ms: responseTimeMs,
        })

        sendEvent(res, 'done', { ok: true, responseTimeMs, record })
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
    return sendJson(res, error.status || 500, {
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

async function listChatRecords(supabase, userId, sort) {
  const { data, error } = await supabase
    .from('chat_records')
    .select('id,user_id,question,answer,status,response_time_ms,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: sort === 'asc' })

  if (error) {
    throw new Error(`读取历史记录失败：${error.message}`)
  }

  return data || []
}

async function deleteChatRecord(supabase, userId, id) {
  const { error } = await supabase
    .from('chat_records')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`删除历史记录失败：${error.message}`)
  }
}

async function listDashboardRecords(supabase) {
  const { data, error } = await supabase
    .from('chat_records')
    .select('id,user_id,response_time_ms,created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`读取统计数据失败：${error.message}`)
  }

  return data || []
}

async function listDashboardProfiles(supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,display_name,department,role')

  if (error) {
    throw new Error(`读取用户画像失败：${error.message}`)
  }

  return data || []
}

function assertDashboardAccess(profile) {
  // 后续可在这里按 profile.role 限制 Dashboard 访问，例如只允许 admin/manager。
  void profile
}

function buildDashboardStats(records, profiles) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const responseTimes = records
    .map((record) => Number(record.response_time_ms))
    .filter((value) => Number.isFinite(value))

  const totalResponseTime = responseTimes.reduce((sum, value) => sum + value, 0)
  const averageResponseTime = responseTimes.length
    ? Math.round(totalResponseTime / responseTimes.length)
    : 0

  return {
    totalQueries: records.length,
    queriesToday: records.filter((record) => new Date(record.created_at) >= todayStart).length,
    averageResponseTime,
    mostActiveUser: getMostActiveUser(records, profileById),
    mostActiveDepartment: getMostActiveDepartment(records, profileById),
    last7DaysTrend: getLast7DaysTrend(records),
  }
}

function getMostActiveUser(records, profileById) {
  const counts = countBy(records, (record) => record.user_id || 'unknown')
  const top = getTopEntry(counts)

  if (!top) {
    return { name: '--', count: 0 }
  }

  const profile = profileById.get(top.key)
  const name = profile?.display_name || profile?.email || 'Unknown User'

  return {
    id: top.key,
    name,
    count: top.count,
  }
}

function getMostActiveDepartment(records, profileById) {
  const counts = countBy(records, (record) => {
    const profile = profileById.get(record.user_id)
    return profile?.department || 'Unassigned'
  })
  const top = getTopEntry(counts)

  return top
    ? { name: top.key, count: top.count }
    : { name: '--', count: 0 }
}

function getLast7DaysTrend(records) {
  const days = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - offset)
    days.push({
      key: getDateKey(date),
      label: formatMonthDay(date),
      count: 0,
    })
  }

  const dayByKey = new Map(days.map((day) => [day.key, day]))

  for (const record of records) {
    const date = new Date(record.created_at)
    if (Number.isNaN(date.getTime())) {
      continue
    }

    const day = dayByKey.get(getDateKey(date))
    if (day) {
      day.count += 1
    }
  }

  return days.map(({ label, count }) => ({ label, count }))
}

function countBy(items, getKey) {
  const counts = new Map()

  for (const item of items) {
    const key = getKey(item)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return counts
}

function getTopEntry(counts) {
  let top = null

  for (const [key, count] of counts.entries()) {
    if (!top || count > top.count) {
      top = { key, count }
    }
  }

  return top
}

function getDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatMonthDay(date) {
  return [
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
