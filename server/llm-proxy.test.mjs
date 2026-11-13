import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { createLlmProxyServer } from './llm-proxy.mjs'

const HOST = '127.0.0.1'

const listen = async (server) => {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, HOST, resolve)
  })
  return `http://${HOST}:${server.address().port}`
}

const close = async (server) => {
  if (!server.listening) return
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
    server.closeAllConnections()
  })
}

const readBody = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

test('proxies DeepSeek requests with the server-only key and configured model', async (t) => {
  let received
  const upstream = createServer(async (req, res) => {
    received = { authorization: req.headers.authorization, body: await readBody(req) }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.end('data: [DONE]\n\n')
  })
  const upstreamUrl = await listen(upstream)
  const proxy = createLlmProxyServer({
    DEEPSEEK_API_KEY: 'test-only-key',
    DEEPSEEK_BASE_URL: upstreamUrl,
    DEEPSEEK_MODEL: 'test-model',
  })
  const proxyUrl = await listen(proxy)
  t.after(async () => {
    await close(proxy)
    await close(upstream)
  })

  const response = await fetch(`${proxyUrl}/llm/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/event-stream')
  assert.equal(await response.text(), 'data: [DONE]\n\n')
  assert.equal(received.authorization, 'Bearer test-only-key')
  assert.equal(received.body.model, 'test-model')
  assert.equal(received.body.stream, true)
})

test('blocks unapproved origins and reports missing server credentials', async (t) => {
  const proxy = createLlmProxyServer({ LLM_PROXY_ALLOWED_ORIGINS: 'http://127.0.0.1:5280' })
  const proxyUrl = await listen(proxy)
  t.after(() => close(proxy))

  const blocked = await fetch(`${proxyUrl}/llm/chat/completions`, {
    method: 'POST',
    headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [] }),
  })
  assert.equal(blocked.status, 403)

  const unconfigured = await fetch(`${proxyUrl}/llm/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
  })
  assert.equal(unconfigured.status, 503)
  assert.equal((await unconfigured.json()).error.code, 'not_configured')
})

test('proxies OpenAI-compatible TTS credentials and returns audio', async (t) => {
  let received
  const audio = Buffer.from('fake-mp3-data')
  const upstream = createServer(async (req, res) => {
    received = { authorization: req.headers.authorization, body: await readBody(req) }
    res.writeHead(200, { 'Content-Type': 'audio/mpeg' })
    res.end(audio)
  })
  const upstreamUrl = await listen(upstream)
  const proxy = createLlmProxyServer({
    TTS_API_KEY: 'test-only-tts-key',
    TTS_BASE_URL: upstreamUrl,
    TTS_MODEL: 'test-tts',
  })
  const proxyUrl = await listen(proxy)
  t.after(async () => {
    await close(proxy)
    await close(upstream)
  })

  const response = await fetch(`${proxyUrl}/llm/tts/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: 'hello', voice: 'alloy', speed: 1.1 }),
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'audio/mpeg')
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), audio)
  assert.equal(received.authorization, 'Bearer test-only-tts-key')
  assert.equal(received.body.model, 'test-tts')
  assert.equal(received.body.input, 'hello')
})
