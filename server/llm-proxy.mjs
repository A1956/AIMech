import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'

const HOST = '127.0.0.1'
const MAX_BODY_BYTES = 1024 * 1024
const UPSTREAM_TIMEOUT_MS = 90000
const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:5280',
  'http://localhost:5280',
  'http://127.0.0.1:4180',
  'http://localhost:4180',
]

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(JSON.stringify(payload))
}

const readJson = async (req) => {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request body too large'), { statusCode: 413 })
    }
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 })
  }
}

const providerUrl = (baseUrl, path) => {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${path}`)
  const isLoopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new Error('Provider URL must use HTTPS')
  }
  return url
}

const relay = async (res, url, apiKey, body) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  res.once('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    })
    if (!upstream.body) {
      res.end()
      return
    }
    await pipeline(Readable.fromWeb(upstream.body), res)
  } catch (error) {
    if (res.headersSent) {
      if (!res.destroyed) res.destroy()
    } else if (!res.destroyed) {
      const timedOut = error.name === 'AbortError'
      sendJson(res, timedOut ? 504 : 502, {
        error: { message: timedOut ? 'Upstream request timed out' : 'Upstream request failed' },
      })
    }
  } finally {
    clearTimeout(timeout)
  }
}

export const createLlmProxyServer = (config = process.env) => {
  const allowedOrigins = new Set(
    (config.LLM_PROXY_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )

  return createServer(async (req, res) => {
    const pathname = new URL(req.url, `http://${HOST}`).pathname
    const origin = req.headers.origin
    if (origin && !allowedOrigins.has(origin)) {
      sendJson(res, 403, { error: { message: 'Origin not allowed' } })
      return
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: { message: 'Method not allowed' } })
      return
    }

    try {
      const body = await readJson(req)
      if (pathname === '/llm/chat/completions') {
        const apiKey = config.DEEPSEEK_API_KEY?.trim()
        if (!apiKey) {
          sendJson(res, 503, {
            error: { code: 'not_configured', message: 'DeepSeek is not configured' },
          })
          return
        }
        if (
          !Array.isArray(body.messages) ||
          body.messages.length > 32 ||
          body.messages.some(
            (message) =>
              !message ||
              !['system', 'user', 'assistant'].includes(message.role) ||
              typeof message.content !== 'string',
          )
        ) {
          sendJson(res, 400, { error: { message: 'Invalid messages' } })
          return
        }
        const baseUrl = config.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
        await relay(res, providerUrl(baseUrl, 'chat/completions'), apiKey, {
          model: config.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: body.messages,
          temperature: 0.3,
          stream: true,
        })
        return
      }

      if (pathname === '/llm/tts/speech') {
        const baseUrl = config.TTS_BASE_URL?.trim()
        if (!baseUrl) {
          sendJson(res, 503, { error: { code: 'not_configured', message: 'TTS is not configured' } })
          return
        }
        if (typeof body.input !== 'string' || !body.input.trim() || body.input.length > 4096) {
          sendJson(res, 400, { error: { message: 'Invalid speech input' } })
          return
        }
        await relay(
          res,
          providerUrl(baseUrl, 'audio/speech'),
          config.TTS_API_KEY?.trim(),
          {
            model: config.TTS_MODEL || 'tts-1',
            voice: typeof body.voice === 'string' ? body.voice : 'alloy',
            input: body.input,
            speed: Number.isFinite(Number(body.speed)) ? Number(body.speed) : 1,
            response_format: 'mp3',
          },
        )
        return
      }

      sendJson(res, 404, { error: { message: 'Not found' } })
    } catch (error) {
      if (!res.headersSent && !res.destroyed) {
        sendJson(res, error.statusCode || 500, {
          error: {
            message: error.statusCode === 413 ? 'Request body too large' : 'Invalid proxy request',
          },
        })
      }
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.LLM_PROXY_PORT || 3002)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('LLM_PROXY_PORT must be an integer from 1 to 65535')
  }

  createLlmProxyServer().listen(port, HOST, () => {
    console.info(`LLM proxy listening on http://${HOST}:${port}`)
  })
}
