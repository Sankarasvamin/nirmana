import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

let cachedClient = null

export function loadSupabaseEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return
  }

  const rawValues = []
  const content = fs.readFileSync(envPath, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const index = trimmed.indexOf('=')

    if (index === -1) {
      rawValues.push(trimmed)
      continue
    }

    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = key === 'SUPABASE_URL' ? normalizeSupabaseUrl(value) : value
  }

  const rawUrl = rawValues.find((value) => /^https?:\/\//.test(value))
  const rawKey = rawValues.find((value) => !/^https?:\/\//.test(value))

  if (rawUrl) {
    process.env.SUPABASE_URL = normalizeSupabaseUrl(rawUrl)
  }

  if (rawKey) {
    process.env.SUPABASE_ANON_KEY = rawKey
  }
}

export function getSupabaseStatus() {
  const { url, anonKey } = getSupabaseConfig(false)

  return {
    configured: Boolean(url && anonKey),
    url: url ? redactSupabaseUrl(url) : null,
  }
}

export function getSupabaseClient(accessToken = '') {
  const { url, anonKey } = getSupabaseConfig()

  if (!accessToken) {
    if (!cachedClient) {
      cachedClient = createClient(url, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }

    return cachedClient
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export async function signInWithPassword({ email, password }) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message || '登录失败。')
  }

  return data
}

export async function refreshAuthSession(refreshToken) {
  const { data, error } = await getSupabaseClient().auth.refreshSession({
    refresh_token: refreshToken,
  })

  if (error) {
    throw new Error(error.message || 'Session 刷新失败。')
  }

  return data
}

export async function signOutSession(accessToken) {
  if (!accessToken) {
    return
  }

  await getSupabaseClient(accessToken).auth.signOut()
}

export async function getAuthenticatedContext(req) {
  const accessToken = getBearerToken(req)

  if (!accessToken) {
    const error = new Error('未登录或 session 已失效。')
    error.status = 401
    throw error
  }

  const supabase = getSupabaseClient(accessToken)
  const { data, error } = await supabase.auth.getUser(accessToken)

  if (error || !data?.user) {
    const authError = new Error(error?.message || '无法验证当前用户。')
    authError.status = 401
    throw authError
  }

  return {
    accessToken,
    supabase,
    user: data.user,
  }
}

export async function readProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role,department,display_name,username,created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`读取用户信息失败：${error.message}`)
  }

  return data
}

export async function insertChatRecord(supabase, record) {
  const { data, error } = await supabase
    .from('chat_records')
    .insert(record)
    .select('id,created_at')
    .single()

  if (error) {
    throw new Error(`保存聊天记录失败：${error.message}`)
  }

  return data
}

function getSupabaseConfig(throwOnMissing = true) {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || '')

  const anonKey = process.env.SUPABASE_ANON_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (throwOnMissing && (!url || !anonKey)) {
    throw new Error('Supabase 配置缺失：请检查 .env.supa 中的 URL 和 anon/publishable key。')
  }

  return { url, anonKey }
}

function normalizeSupabaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '')
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || ''
  const match = /^Bearer\s+(.+)$/i.exec(authorization)
  return match ? match[1].trim() : ''
}

function redactSupabaseUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.origin
  } catch {
    return 'configured'
  }
}
