/** 同义检索词。回答正文仍从案例字段生成，避免和库里的表述两套说法。 */
const KEYWORDS = {
  1: ['壁虎', '黏附', '粘附', '干黏', '干粘', '范德华', '剥离', '爬壁', 'gecko', 'spatula'],
  2: ['蜂巢', '蜂窝', '夹层', '比刚度', 'honeycomb', 'sandwich'],
  3: ['鲨鱼', '减阻', '沟槽', '盾鳞', '湍流', 'shark', 'riblet'],
  4: ['鸟骨', '骨小梁', '中空', '桁架', '屈曲', '点阵', '轻量化', 'lattice'],
  5: ['蝙蝠', '声呐', '超声', '回波', '定位', 'bat', 'sonar'],
  6: ['荷叶', '自清洁', '超疏水', '润湿', '乳突', 'lotus', '接触角'],
  7: ['翠鸟', '减噪', '降噪', '车头', '入水', '喙', 'kingfisher', '微气压'],
  8: ['蛇形', '蛇', '冗余', '步态', '管道', '搜救', 'serpenoid', '曲率波'],
}

/** 当前在途请求的中断控制器；页面卸载或重新发送时调用 abortActiveReply 中断 */
let activeController = null

/** 中断当前 DeepSeek 流式请求 */
export const abortActiveReply = () => {
  if (activeController) {
    activeController.abort()
    activeController = null
  }
}

/** 读取公开的前端开关与超时配置；密钥只保存在服务端环境变量中。 */
export const getLlmConfig = () => {
  const remoteEnabled = String(import.meta.env.VITE_DEEPSEEK_ENABLED || '').trim().toLowerCase() === 'true'
  const timeout = Number(import.meta.env.VITE_DEEPSEEK_TIMEOUT || 30000)
  return {
    remoteEnabled,
    timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : 30000,
  }
}

export const llmConfigured = () => getLlmConfig().remoteEnabled

export const llmConfigHint = () => {
  if (!llmConfigured()) return '未启用远程 DeepSeek，当前使用本地案例引擎。'
  return '已启用远程 DeepSeek 服务端代理；请求失败时将自动回退本地案例引擎。'
}

const scoreCase = (item, question) => {
  const text = question.toLowerCase()
  const keys = KEYWORDS[item.id] || []
  const keyScore = keys.reduce((sum, key) => sum + (text.includes(key.toLowerCase()) ? 2 : 0), 0)
  const tagScore = (item.tags || []).reduce((sum, tag) => sum + (question.includes(tag) ? 3 : 0), 0)
  const titleScore = question.includes(item.title.slice(0, 4)) ? 3 : 0
  return keyScore + tagScore + titleScore
}

const buildAnswer = (primary, secondary, question = '') => {
  const param = primary.params?.[0]
  const paramLine = param
    ? `优先盯住的参数：${param.name}（${param.symbol}）${param.value} ${param.unit}。${param.note}`
    : '优先回到该案例的参数表，不要只模仿外形。'
  const compare = secondary
    ? `\n对照：若约束更接近「${secondary.title}」，机制是另一条路，不要把两者合成一个外形。`
    : ''

  // 壁虎 + 剥离角：给更贴题的机理说明
  if (primary.id === 1 && /剥离|黏附|粘附|范德华|壁虎/.test(question)) {
    return [
      '结论：壁虎足黏附主要靠范德华力（干黏附），不是胶水或负压。',
      '机理：脚趾刚毛末端的 spatula 与表面形成分子级近距离接触，大量微弱范德华力并联后足够承载。',
      '剥离角为什么不能随便加大：剥离时要把接触从“贴合”切到“揭起”。角度过大，法向分量猛增，刚毛会整片同时失黏，承载力骤降，也可能拉伤微结构。',
      '工程映射：执行器应控制剥离角与分区揭起顺序，让接触区逐步退出，而不是整足硬撕。',
      paramLine,
      `案例对照：${primary.title}；生物原型：${primary.bioPrototype}`,
      `可迁移表述：${primary.principle}`,
      '教学建议：设计任务里把“剥离角范围 + 分区揭起”写进约束，潮湿或粗糙工况不要把干黏附当唯一主方案。',
    ].join('\n') + compare
  }

  return [
    `结论：这个问题更接近「${primary.title}」。`,
    `生物原型：${primary.bioPrototype}`,
    `可迁移机理：${primary.principle}`,
    `机械方案：${primary.structure}`,
    paramLine,
    `工程上可以落到：${(primary.applications || []).slice(0, 2).join('、')}。`,
    '教学建议：把上述参数写进设计任务的约束和校核项，再拿到参数推荐里用载荷、介质和重量上限核一次。',
  ].join('\n') + compare
}

/** 是否按英语提问：有足够拉丁字母，且几乎没有汉字时才判为英语 */
const isEnglishQuestion = (raw) => {
  const text = String(raw || '').trim()
  if (!text) return false
  const letters = (text.match(/[A-Za-z]/g) || []).length
  const han = (text.match(/[\u4e00-\u9fff]/g) || []).length
  if (han > 0) return false
  return letters >= 3
}

const overview = (cases, inEnglish = false) => {
  const names = cases.map((item) => item.title).join('、')
  if (inEnglish) {
    return {
      content: `Hi, I'm XiaoZhi, your bionic mechanism design tutor.\nI retrieve the case library first, then explain mechanism, structure, and checkable parameters.\nCurrent cases: ${names}.\nYou can tap an example below, or ask with a working-condition constraint.`,
      refCaseId: null,
    }
  }
  return {
    content: `你好，我是仿生机械设计 AI 助教「小智」。\n回答会先检索案例库，再组织机理、结构和参数，而不是只给一句比喻。\n当前案例库覆盖：${names}。\n你可以点下方示例，或直接问工况约束，例如“潮湿表面还能否用干黏附”。`,
    refCaseId: null,
  }
}

/** 中英打招呼 / 自我介绍 / 感谢 / 告别等闲聊意图 */
const matchChitchat = (raw) => {
  const text = raw.trim()
  const lower = text.toLowerCase()
  // 去掉标点后判断短寒暄
  const compact = lower.replace(/[\s,.!?？！。，、~～]+/g, '')

  const isGreeting =
    /^(你好|您好|嗨|哈喽|早|早上好|中午好|下午好|晚上好|在吗|在不在)/.test(text) ||
    /^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|yo)\b/.test(lower) ||
    ['你好啊', '你好呀', '您好啊', 'hello', 'hi', 'hey'].includes(compact)

  const isWho =
    /你是谁|你叫什么|介绍一下你自己|你能做什么|怎么用|帮助|功能/.test(text) ||
    /\b(who\s+are\s+you|what\s+can\s+you\s+do|your\s+name|help)\b/.test(lower)

  const isThanks =
    /谢谢|感谢|多谢|谢了/.test(text) ||
    /\b(thanks|thank\s*you|thx|ty)\b/.test(lower)

  const isBye =
    /再见|拜拜|回见|下次聊/.test(text) ||
    /\b(bye|goodbye|see\s+you|cya)\b/.test(lower)

  if (isGreeting || isWho) return 'hello'
  if (isThanks) return 'thanks'
  if (isBye) return 'bye'
  return ''
}

const chitchatReply = (kind, cases, inEnglish = false) => {
  if (kind === 'thanks') {
    return {
      content: inEnglish
        ? "You're welcome — ask anytime about gecko adhesion, honeycomb, riblets, etc."
        : '不客气。有具体仿生结构或参数问题随时问我，例如剥离角、夹层比刚度、沟槽 s+ 等。',
      refCaseId: null,
    }
  }
  if (kind === 'bye') {
    return {
      content: inEnglish
        ? 'Bye for now — see you in the case library or learning path.'
        : '好的，下次见。复习时可从案例库或学习路径继续。',
      refCaseId: null,
    }
  }
  return overview(cases, inEnglish)
}

/** 本地检索式回答，案例改了之后回答会跟着变 */
export const askLocalTutor = (question, cases) => {
  const text = question.trim()
  const inEnglish = isEnglishQuestion(text)
  if (!text) {
    return { content: '请先写下具体的结构、介质或参数问题。', refCaseId: null }
  }

  const chatKind = matchChitchat(text)
  if (chatKind === 'thanks' || chatKind === 'bye') {
    return chitchatReply(chatKind, cases, inEnglish)
  }
  // 打招呼 / 自我介绍：短句走闲聊；长句且能命中案例则仍检索
  if (chatKind === 'hello' && (text.length <= 36 || !scoreAnyCase(cases, text))) {
    return chitchatReply('hello', cases, inEnglish)
  }

  const ranked = [...cases]
    .map((item) => ({ item, score: scoreCase(item, text) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.item.id - right.item.id)
  if (!ranked.length) {
    const tip = inEnglish
      ? 'No clear case hit — try naming a bio-prototype or working condition.'
      : '这次没有检索到足够明确的案例。把生物原型或工况再写具体一些。'
    return {
      content: `${overview(cases, inEnglish).content}\n\n${tip}`,
      refCaseId: null,
    }
  }
  const secondary = ranked[1] && ranked[1].score === ranked[0].score ? ranked[1].item : null
  return {
    content: buildAnswer(ranked[0].item, secondary, text),
    refCaseId: ranked[0].item.id,
  }
}

const scoreAnyCase = (cases, text) =>
  (cases || []).some((item) => scoreCase(item, text) > 0)

const catalog = (cases) =>
  cases
    .map((item) => `${item.id}. ${item.title}：${item.principle.slice(0, 80)}`)
    .join('\n')

/**
 * 解析 DeepSeek 流式响应（SSE）。
 * 每帧 `data: {...}`，增量在 `choices[0].delta.content`，结束标记 `data: [DONE]`。
 */
const consumeDeepseekStream = async (response, onDelta) => {
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let done = false
  while (!done) {
    const chunk = await reader.read()
    done = chunk.done
    if (done) break
    buffer += decoder.decode(chunk.value, { stream: true })
    let index = buffer.indexOf('\n')
    while (index >= 0) {
      const line = buffer.slice(0, index).trim()
      buffer = buffer.slice(index + 1)
      if (line.startsWith('data:')) {
        const raw = line.slice(5).trim()
        if (raw && raw !== '[DONE]') {
          try {
            const event = JSON.parse(raw)
            const piece = event?.choices?.[0]?.delta?.content
            if (typeof piece === 'string' && piece) onDelta(piece)
          } catch {
            /* 忽略半帧或心跳 */
          }
        }
      }
      index = buffer.indexOf('\n')
    }
  }
}

/**
 * 调用 DeepSeek 对话模型（流式）。
 * 全部参数来自环境变量，支持多轮上下文（由调用方传入 messages）。
 * @param {Array<{role: string, content: string}>} messages 对话历史（含 system 与最新 user 消息）
 * @param {(piece: string) => void} onDelta 流式增量回调
 * @param {AbortSignal} [signal] 外部中断信号
 * @returns {Promise<{ ok: boolean, content: string, error: string }>}
 */
export const askDeepseek = async (messages, onDelta, signal) => {
  const { remoteEnabled, timeout } = getLlmConfig()
  if (!remoteEnabled) {
    return { ok: false, content: '', error: 'not_configured' }
  }

  const controller = new AbortController()
  activeController = controller
  const timer = window.setTimeout(() => controller.abort(), timeout)
  const onExternalAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onExternalAbort, { once: true })
  }

  try {
    const response = await fetch('/llm/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
      }),
    })

    if (response.status === 503) {
      return { ok: false, content: '', error: 'not_configured' }
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, content: '', error: 'auth' }
    }
    if (response.status === 402 || response.status === 429) {
      return { ok: false, content: '', error: 'limit' }
    }
    if (!response.ok) {
      // 尝试读取服务端错误信息
      let detail = `http_${response.status}`
      try {
        const text = await response.text()
        const payload = text ? JSON.parse(text) : null
        if (payload?.error?.message) detail = payload.error.message
      } catch {
        /* 保留状态码 */
      }
      return { ok: false, content: '', error: detail }
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/event-stream')) {
      // 非流式兜底：按 JSON 整体解析
      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content || ''
      if (!content) return { ok: false, content: '', error: 'empty' }
      onDelta?.(content)
      return { ok: true, content, error: '' }
    }

    let content = ''
    await consumeDeepseekStream(response, (piece) => {
      content += piece
      onDelta?.(piece)
    })
    if (!content.trim()) return { ok: false, content: '', error: 'empty' }
    return { ok: true, content, error: '' }
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { ok: false, content: '', error: signal?.aborted ? 'aborted' : 'timeout' }
    }
    return { ok: false, content: '', error: 'network' }
  } finally {
    window.clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onExternalAbort)
    if (activeController === controller) activeController = null
  }
}

const remoteErrorMessage = (code) => {
  if (code === 'not_configured') return '未配置服务端 DeepSeek API Key，已使用本地案例引擎。'
  if (code === 'auth') return '服务端 DeepSeek 鉴权失败，已回退本地引擎。'
  if (code === 'limit') return 'DeepSeek 额度不足或请求过于频繁，已回退本地案例引擎。'
  if (code === 'timeout') return 'DeepSeek 请求超时，已回退本地案例引擎。'
  if (code === 'network') return '无法连接 DeepSeek 服务，已回退本地案例引擎。'
  if (code === 'empty') return 'DeepSeek 返回空内容，已回退本地案例引擎。'
  if (code === 'aborted') return '已中断本次回答。'
  if (String(code).startsWith('http_')) {
    return `DeepSeek 服务异常（${code.replace('http_', '')}），已回退本地案例引擎。`
  }
  return `DeepSeek 请求失败：${code}。已回退本地案例引擎。`
}

/**
 * 组装多轮上下文的 messages：system（人设 + 案例库） + 历史对话 + 当前问题。
 * 只回传最近 N 轮，避免上下文超长。
 * @param {string} question 当前问题
 * @param {Array} cases 案例库
 * @param {Array<{role: string, content: string}>} [history] 历史消息（不含当前问题）
 */
const buildMessages = (question, cases, history = []) => {
  const inEnglish = isEnglishQuestion(question)
  const langRule = inEnglish
    ? 'Reply in English because the user asked in English.'
    : '用户未用英语提问时，一律用中文回答，不要夹杂英文句子或英文复述。'

  const system = `你是机械与机器人专业的仿生设计 AI 助教，名字叫「小智」。只用下面的案例机理回答，不要编造参数。${langRule}\n${catalog(cases)}`

  const historyMessages = (history || [])
    .filter((item) => item && typeof item.content === 'string' && item.content.trim())
    .slice(-12)
    .map((item) => ({ role: item.role === 'user' ? 'user' : 'assistant', content: item.content }))

  return [{ role: 'system', content: system }, ...historyMessages, { role: 'user', content: question }]
}

/**
 * 回答优先级：DeepSeek 大模型 → 本地案例引擎。
 * 大模型失败或超时自动降级到本地，绝不把课堂问答卡死在第三方接口上。
 * @param {string} question
 * @param {Array} cases
 * @param {{
 *   conversationId?: string|number,
 *   userId?: string|number,
 *   history?: Array<{role: string, content: string}>,
 *   signal?: AbortSignal,
 *   onDelta?: (piece: string, full: string) => void,
 * }} [ctx]
 * @returns {Promise<{ content: string, refCaseId: number|null, source: 'remote'|'local', notice: string }>}
 */
export const createTutorReply = async (question, cases, ctx = {}) => {
  const local = askLocalTutor(question, cases)

  if (!llmConfigured()) {
    return {
      ...local,
      source: 'local',
      notice: '',
    }
  }

  let full = ''
  const messages = buildMessages(question, cases, ctx.history)
  const remote = await askDeepseek(
    messages,
    (piece) => {
      full += piece
      ctx.onDelta?.(piece, full)
    },
    ctx.signal,
  )

  if (remote.ok && remote.content.trim()) {
    return {
      content: remote.content,
      refCaseId: local.refCaseId,
      source: 'remote',
      notice: '',
    }
  }

  // 用户主动中断：直接本地回答，不提示错误
  if (remote.error === 'aborted') {
    return { ...local, source: 'local', notice: '' }
  }

  // 超时静默降级，其余显示原因
  const notice = remote.error === 'timeout' ? '' : remoteErrorMessage(remote.error)
  return { ...local, source: 'local', notice }
}
