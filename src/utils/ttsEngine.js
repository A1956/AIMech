/**
 * 语音合成：
 * 1) browser（默认）—— 系统 SpeechSynthesis，优先微软晓晓等 Neural/Natural 女声
 * 2) baidu —— 百度公开 TTS（代理，免密钥）
 * 3) openai —— 兼容 /v1/audio/speech
 */

const stripForSpeech = (text = '') =>
  String(text)
    .replace(/[（(]远程失败，已回退本地[）)]/g, '')
    .replace(/[`*_#>\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** 按句切分 */
const chunkText = (text, limit = 180) => {
  const clean = stripForSpeech(text)
  if (!clean) return []
  if (clean.length <= limit) return [clean]
  const parts = []
  let rest = clean
  while (rest.length > limit) {
    const slice = rest.slice(0, limit)
    const cut = Math.max(
      slice.lastIndexOf('。'),
      slice.lastIndexOf('！'),
      slice.lastIndexOf('？'),
      slice.lastIndexOf('；'),
      slice.lastIndexOf('，'),
      slice.lastIndexOf(' '),
    )
    const at = cut > 20 ? cut + 1 : limit
    parts.push(rest.slice(0, at).trim())
    rest = rest.slice(at).trim()
  }
  if (rest) parts.push(rest)
  return parts.filter(Boolean)
}

export const getTtsConfig = () => {
  // 默认系统神经语音（晓晓等）；可改为 baidu / openai
  const provider = String(import.meta.env.VITE_TTS_PROVIDER || 'browser').trim().toLowerCase()
  const voice = String(
    import.meta.env.VITE_TTS_VOICE || (provider === 'baidu' ? '4' : 'Xiaoxiao'),
  ).trim()
  // browser 语速偏快：默认 1.2；百度 spd 默认 6
  const rawSpeed = import.meta.env.VITE_TTS_SPEED
  const speed =
    rawSpeed !== undefined && rawSpeed !== ''
      ? Number(rawSpeed)
      : provider === 'baidu'
        ? 6
        : 1.2
  return { provider, voice, speed }
}

export const ttsConfigured = () => {
  const { provider } = getTtsConfig()
  if (provider === 'baidu' || provider === 'browser') return true
  if (provider === 'openai') return true
  return true
}

export const ttsConfigHint = () => {
  const { provider } = getTtsConfig()
  if (provider === 'browser') return '语音：系统神经女声（优先微软晓晓 / Neural）'
  if (provider === 'baidu') return '语音：国内百度免费 TTS'
  if (provider === 'openai') return '语音：兼容 OpenAI /audio/speech'
  return '语音未配置'
}

/** 百度公开 TTS */
const synthesizeBaiduBlob = async (text) => {
  const { voice, speed } = getTtsConfig()
  const per = Number(voice) || 4
  const spd = Number.isFinite(Number(speed)) ? Math.min(9, Math.max(1, Number(speed))) : 6
  const params = new URLSearchParams({
    lan: 'zh',
    ie: 'UTF-8',
    spd: String(spd),
    pit: '5',
    vol: '8',
    per: String(per),
    aue: '3',
    text,
  })
  const url = `/tts-baidu?${params.toString()}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = new Error(`Baidu TTS ${response.status}`)
    err.userMessage = '国内语音服务暂时不可用，将尝试系统语音'
    throw err
  }
  const type = response.headers.get('content-type') || ''
  const blob = await response.blob()
  if (type.includes('json') || type.includes('text') || blob.size < 80) {
    const err = new Error('Baidu TTS empty')
    err.userMessage = '国内语音合成失败，将尝试系统语音'
    throw err
  }
  return blob
}

/** OpenAI 兼容接口（可选） */
const synthesizeOpenaiBlob = async (text) => {
  const { voice, speed } = getTtsConfig()
  const response = await fetch('/llm/tts/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voice,
      input: text.slice(0, 4096),
      speed: Math.min(1.5, Math.max(0.75, Number(speed) || 1.15)),
      response_format: 'mp3',
    }),
  })
  if (!response.ok) {
    const err = new Error(`TTS HTTP ${response.status}`)
    err.userMessage = `语音合成失败（${response.status}）`
    throw err
  }
  return response.blob()
}

const ensureVoices = () =>
  new Promise((resolve) => {
    const synth = window.speechSynthesis
    if (!synth) {
      resolve([])
      return
    }
    const current = synth.getVoices() || []
    if (current.length) {
      resolve(current)
      return
    }
    const done = () => resolve(synth.getVoices() || [])
    synth.addEventListener('voiceschanged', done, { once: true })
    window.setTimeout(done, 400)
  })

/**
 * 评分选声：优先 Neural/Natural + 晓晓等中文女声
 * @param {SpeechSynthesisVoice[]} list
 * @param {string} preferName
 */
const pickZhNeuralFemaleVoice = (list = [], preferName = 'Xiaoxiao') => {
  const scored = list
    .map((v) => {
      const blob = `${v.lang} ${v.name}`
      const isZh = /zh[-_]?CN|zh[-_]?TW|Chinese|中文|普通话|國語|国语/i.test(blob)
      if (!isZh) return { v, score: -1 }

      let score = 10
      // 神经/自然音优先
      if (/neural|natural|online|自然|神经/i.test(blob)) score += 50
      // 微软晓晓及常见温柔女声
      if (/Xiaoxiao|晓晓/i.test(blob)) score += 40
      if (preferName && new RegExp(preferName, 'i').test(blob)) score += 35
      if (/Xiaoyi|晓伊|Xiaoxuan|晓萱|Xiaohan|晓涵|Yaoyao|晓瑶|Huihui|慧慧|Yunxi|云希|Yunyang|Meijia|美佳/i.test(blob)) {
        score += 25
      }
      if (/female|女/i.test(blob)) score += 15
      // 排除明显男声
      if (/male|男|Yunjian|云健|Kangkang|晓东|Yunye/i.test(blob) && !/female|女/i.test(blob)) {
        score -= 40
      }
      // Microsoft 桌面/Edge 常见前缀
      if (/Microsoft/i.test(blob)) score += 8
      return { v, score }
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.v || null
}

/** 系统神经女声朗读（更快语速） */
const speakBrowser = async (text) => {
  if (!window.speechSynthesis) {
    const err = new Error('no speechSynthesis')
    err.userMessage = '当前浏览器不支持语音朗读'
    throw err
  }
  const { voice: preferName, speed } = getTtsConfig()
  const voices = await ensureVoices()
  const picked = pickZhNeuralFemaleVoice(voices, preferName)

  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = picked?.lang || 'zh-CN'
  if (picked) utter.voice = picked
  // 语速偏快：默认约 1.2，上限 1.6
  const rate = Number.isFinite(Number(speed)) ? Number(speed) : 1.2
  utter.rate = Math.min(1.6, Math.max(0.85, rate))
  utter.pitch = 1.02

  await new Promise((resolve, reject) => {
    utter.onend = () => resolve()
    utter.onerror = () => {
      reject(Object.assign(new Error('speech error'), { userMessage: '系统语音朗读失败' }))
    }
    window.speechSynthesis.speak(utter)
  })
}

export const synthesizeSpeechBlob = async (text) => {
  const { provider } = getTtsConfig()
  const input = stripForSpeech(text)
  if (!input) {
    const err = new Error('无可朗读内容')
    err.userMessage = '当前没有可朗读的文字'
    throw err
  }
  if (provider === 'openai') return synthesizeOpenaiBlob(input)
  if (provider === 'baidu') return synthesizeBaiduBlob(input)
  await speakBrowser(input)
  return null
}

/**
 * @returns {Promise<Blob[] | 'browser'>}
 */
export const synthesizeSpeechChunks = async (text) => {
  const { provider } = getTtsConfig()
  const clean = stripForSpeech(text)
  if (!clean) return []

  // 默认 / browser：整段用神经女声，按句切分避免过长截断
  if (provider === 'browser' || !provider) {
    const parts = chunkText(clean, 220)
    for (const part of parts) {
      // eslint-disable-next-line no-await-in-loop
      await speakBrowser(part)
    }
    return 'browser'
  }

  const limit = provider === 'baidu' ? 90 : 420
  const parts = chunkText(clean, limit)
  const blobs = []
  try {
    for (const part of parts) {
      // eslint-disable-next-line no-await-in-loop
      const blob = await synthesizeSpeechBlob(part)
      if (blob) blobs.push(blob)
    }
    return blobs
  } catch (err) {
    // 失败回退系统神经女声
    for (const part of chunkText(clean, 220)) {
      // eslint-disable-next-line no-await-in-loop
      await speakBrowser(part)
    }
    return 'browser'
  }
}
