<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Delete, Headset, Plus, Promotion, VideoPause } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchCases } from '@/api/case'
import {
  createConversation,
  createMessage,
  fetchConversations,
  fetchMessages,
  patchConversation,
  removeConversation,
  removeMessage,
} from '@/api/chat'
import CaseRefCard from '@/components/business/CaseRefCard.vue'
import SmartIcon from '@/components/common/SmartIcon.vue'
import StateView from '@/components/common/StateView.vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useChatStream } from '@/composables/useChatStream'
import { usePermission } from '@/composables/usePermission'
import { usePoints } from '@/composables/usePoints'
import { useTutorSpeech } from '@/composables/useTutorSpeech'
import { SUGGESTED_PROMPTS } from '@/types'
import { formatDate } from '@/utils/format'
import { abortActiveReply, createTutorReply, llmConfigHint, llmConfigured } from '@/utils/tutorEngine'
import { ttsConfigured } from '@/utils/ttsEngine'

const router = useRouter()
const { profile } = useAuth()
const { isStudent } = usePermission()
const { freeLeftToday, chatQuota, tryConsumeChat, refreshPoints } = usePoints()
const { streaming, pushLines, cancel } = useChatStream()
const {
  voiceReply,
  speaking,
  loadingSpeech,
  setVoiceReply,
  speak,
  speakIfEnabled,
  stop: stopSpeech,
} = useTutorSpeech()

const loading = ref(true)
const error = ref('')
const conversations = ref([])
const messages = ref([])
const cases = ref([])
const activeId = ref(null)
const input = ref('')
const sending = ref(false)
const waiting = ref(false)
const msgLoading = ref(false)
const listRef = ref(null)
const caseMap = computed(() => Object.fromEntries(cases.value.map((item) => [item.id, item])))
const teacherSubtitle = '教师可预览小智问答效果'
/** 额度数字变化时轻脉冲 */
const freePulse = ref(false)
const quotaPulse = ref(false)
let freePulseTimer = 0
let quotaPulseTimer = 0

watch(freeLeftToday, () => {
  if (!isStudent.value) return
  freePulse.value = true
  window.clearTimeout(freePulseTimer)
  freePulseTimer = window.setTimeout(() => {
    freePulse.value = false
  }, 650)
})

watch(chatQuota, () => {
  if (!isStudent.value) return
  quotaPulse.value = true
  window.clearTimeout(quotaPulseTimer)
  quotaPulseTimer = window.setTimeout(() => {
    quotaPulse.value = false
  }, 650)
})

const logLlmConfigOnce = () => {
  console.log(llmConfigHint())
}

const scrollBottom = async () => {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
}

const loadConversations = async () => {
  conversations.value = await fetchConversations(profile.value.id)
  if (!activeId.value && conversations.value.length) {
    activeId.value = conversations.value[0].id
  }
}

const loadMessages = async () => {
  if (!activeId.value) {
    messages.value = []
    return
  }
  msgLoading.value = true
  try {
    messages.value = await fetchMessages(activeId.value)
    await scrollBottom()
  } finally {
    msgLoading.value = false
  }
}

const bootstrap = async () => {
  loading.value = true
  error.value = ''
  try {
    const caseRes = await fetchCases()
    cases.value = caseRes.list
    await loadConversations()
    await loadMessages()
  } catch (err) {
    error.value = err.userMessage || '助教数据加载失败'
  } finally {
    loading.value = false
  }
}

const selectConversation = async (id) => {
  if (streaming.value || sending.value || waiting.value) return
  activeId.value = id
  await loadMessages()
}

const createNew = async () => {
  if (sending.value || waiting.value) return
  const now = new Date().toISOString()
  const created = await createConversation({
    userId: profile.value.id,
    title: '新的仿生设计问答',
    createdAt: now,
    updatedAt: now,
  })
  conversations.value = [created, ...conversations.value]
  activeId.value = created.id
  messages.value = []
}

const isPersistId = (id) => typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))

const clearAllSessions = async () => {
  if (!conversations.value.length || sending.value || streaming.value || waiting.value) return
  try {
    await ElMessageBox.confirm('将删除全部会话及消息，且不可恢复。确认清空？', '清空全部会话', {
      type: 'warning',
      confirmButtonText: '全部清空',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  // 清空以本地状态为准；删除请求静默失败，绝不弹出「服务器异常」
  cancel()
  stopSpeech()
  waiting.value = false
  const list = [...conversations.value]
  conversations.value = []
  messages.value = []
  activeId.value = null
  ElMessage.success('已清空全部会话')
  for (const conv of list) {
    const msgs = await fetchMessages(conv.id, { silent: true }).catch(() => [])
    const msgIds = msgs.map((item) => item.id).filter(isPersistId)
    await Promise.allSettled(msgIds.map((id) => removeMessage(id, { silent: true })))
    if (isPersistId(conv.id)) {
      await removeConversation(conv.id, { silent: true }).catch(() => null)
    }
  }
}

const ensureConversation = async (question) => {
  if (activeId.value) return activeId.value
  const now = new Date().toISOString()
  const created = await createConversation({
    userId: profile.value.id,
    title: question.slice(0, 18) || '新的仿生设计问答',
    createdAt: now,
    updatedAt: now,
  })
  conversations.value = [created, ...conversations.value]
  activeId.value = created.id
  return created.id
}

/** 不可变更新临时助手气泡，避免被并发 loadMessages 冲掉后找不到引用 */
const patchDraft = (draftId, partial) => {
  messages.value = messages.value.map((item) =>
    item.id === draftId ? { ...item, ...partial } : item,
  )
}

const send = async (preset = '') => {
  // 兼容按钮事件误传：只接受字符串预设
  const presetText = typeof preset === 'string' ? preset : ''
  const text = (presetText || input.value).trim()
  if (!text) return
  // 若上次卡死，允许用户再次点击
  if (sending.value || streaming.value || waiting.value) {
    cancel()
    stopSpeech()
    sending.value = false
    waiting.value = false
  }
  sending.value = true
  const draftId = `tmp-${Date.now()}`
  try {
    if (isStudent.value) {
      await refreshPoints()
      const quota = await tryConsumeChat()
      if (!quota.ok) {
        ElMessage.warning({
          message: quota.reason || '问答次数不足，请先兑换小智问答次数',
          duration: 4200,
          showClose: true,
        })
        try {
          await ElMessageBox.confirm(
            `${quota.reason || '今日免费与兑换余量均已用完。'}是否前往积分兑换？`,
            '无法提问',
            { type: 'warning', confirmButtonText: '去兑换', cancelButtonText: '知道了' },
          )
          router.push('/rewards')
        } catch {
          /* 留在本页 */
        }
        return
      }
    }

    if (!cases.value.length) {
      try {
        const caseRes = await fetchCases()
        cases.value = caseRes.list || []
      } catch {
        /* 仍本地回答 */
      }
    }

    const conversationId = await ensureConversation(text)
    const now = new Date().toISOString()
    // 先上屏，避免接口慢时“点了没反应”
    const optimisticUser = {
      id: `tmp-user-${Date.now()}`,
      conversationId,
      role: 'user',
      content: text,
      refCaseId: null,
      createdAt: now,
    }
    const assistantDraft = {
      id: draftId,
      conversationId,
      role: 'assistant',
      content: '',
      refCaseId: null,
      createdAt: new Date().toISOString(),
      pending: true,
      waiting: true,
    }
    messages.value = [...messages.value, optimisticUser, assistantDraft]
    input.value = ''
    waiting.value = true
    await scrollBottom()

    const userMsg = await createMessage({
      conversationId,
      role: 'user',
      content: text,
      refCaseId: null,
      createdAt: now,
    })
    messages.value = messages.value.map((item) =>
      item.id === optimisticUser.id ? userMsg : item,
    )

    const MIN_WAIT_MS = 1500
    const waitStart = Date.now()
    // 取当前会话历史（排除刚上屏的临时消息与草稿），作为多轮上下文回传大模型
    const history = messages.value
      .filter((item) => !String(item.id).startsWith('tmp-'))
      .map((item) => ({ role: item.role, content: item.content }))
    const reply = await createTutorReply(text, cases.value, {
      conversationId,
      userId: profile.value.id,
      history,
    })
    const waitLeft = MIN_WAIT_MS - (Date.now() - waitStart)
    if (waitLeft > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitLeft))
    }
    if (reply.notice && reply.source === 'local' && llmConfigured() && reply.notice) {
      ElMessage.warning(reply.notice)
    }

    waiting.value = false
    // 若并发刷新冲掉了草稿，重新插入助手气泡
    if (!messages.value.some((item) => item.id === draftId)) {
      messages.value = [
        ...messages.value,
        {
          id: draftId,
          conversationId,
          role: 'assistant',
          content: '',
          refCaseId: reply.refCaseId,
          createdAt: new Date().toISOString(),
          pending: true,
          waiting: false,
          notice: reply.notice || '',
        },
      ]
    } else {
      patchDraft(draftId, {
        waiting: false,
        refCaseId: reply.refCaseId,
        notice: reply.notice || '',
      })
    }

    await pushLines(reply.content, (chunk) => {
      patchDraft(draftId, { content: chunk, waiting: false, pending: true })
      scrollBottom()
    })
    patchDraft(draftId, { pending: false })

    const saved = await createMessage({
      conversationId,
      role: 'assistant',
      content: reply.content,
      refCaseId: reply.refCaseId,
      createdAt: new Date().toISOString(),
    })
    messages.value = messages.value.map((item) =>
      item.id === draftId ? { ...saved, notice: reply.notice || '' } : item,
    )

    speakIfEnabled(reply.content)

    const title = text.slice(0, 18)
    await patchConversation(conversationId, { title, updatedAt: new Date().toISOString() })
    await loadConversations()
  } catch (err) {
    cancel()
    stopSpeech()
    waiting.value = false
    messages.value = messages.value.filter((item) => item.id !== draftId)
    ElMessage.error(err.userMessage || err.message || '发送失败')
  } finally {
    sending.value = false
  }
}

const onToggleVoice = (on) => {
  setVoiceReply(on)
  if (on) {
    ElMessage.success(
      ttsConfigured()
        ? '已开启语音回答：优先微软晓晓等神经女声，语速偏快'
        : '已开启语音回答',
    )
  }
}

const replaySpeech = (content) => {
  if (!content) return
  speak(content)
}

watch(activeId, () => {
  // 发送过程中禁止刷新消息，否则会冲掉临时助手气泡导致“没反应”
  if (loading.value || sending.value || waiting.value || streaming.value) return
  loadMessages()
})

onMounted(() => {
  logLlmConfigOnce()
  bootstrap()
  refreshPoints()
})

onUnmounted(() => {
  window.clearTimeout(freePulseTimer)
  window.clearTimeout(quotaPulseTimer)
  abortActiveReply()
  stopSpeech()
})
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem-2.5rem)] min-h-[480px] flex-col">
    <header class="tutor-page-header relative mb-4">
      <div class="flex items-center justify-between gap-3">
        <div class="w-[7.5rem] shrink-0" aria-hidden="true" />
        <h1 class="tutor-page-title flex min-w-0 flex-1 items-center justify-center gap-2 text-xl font-semibold tracking-wide text-paper md:text-2xl">
          <SmartIcon name="tutor" :size="28" class="tutor-title-icon shrink-0 text-teal" />
          <span>「小智」助教</span>
        </h1>
        <div class="flex w-[7.5rem] shrink-0 flex-wrap items-center justify-end gap-2">
          <el-switch
            :model-value="voiceReply"
            inline-prompt
            active-text="语音"
            inactive-text="静音"
            @change="onToggleVoice"
          />
          <el-button
            v-if="speaking || loadingSpeech"
            size="small"
            plain
            :icon="VideoPause"
            @click="stopSpeech"
          >
            停止
          </el-button>
        </div>
      </div>
      <p v-if="isStudent" class="tutor-quota-line mt-2 text-center text-sm text-mist">
        今日免费剩余
        <span class="tutor-quota-num is-free" :class="{ 'is-pulse': freePulse }">{{ freeLeftToday }}</span>
        次 （目前学习积分可兑换
        <span class="tutor-quota-num is-pack" :class="{ 'is-pulse': quotaPulse }">{{ chatQuota }}</span>
        次）
      </p>
      <p v-else class="mt-2 text-center text-sm text-mist">{{ teacherSubtitle }}</p>
    </header>

    <StateView :loading="loading" :error="error" @retry="bootstrap">
      <template #loading>
        <div class="bio-card h-96 p-5"><el-skeleton animated :rows="8" /></div>
      </template>

      <div class="bio-card grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-hidden lg:h-[calc(100vh-3.5rem-7rem)] lg:grid-cols-[220px_1fr] lg:grid-rows-1">
        <aside class="flex min-h-0 flex-col border-b border-[color:var(--bio-line)] p-3 lg:border-b-0 lg:border-r">
          <div class="mb-3 flex gap-2">
            <el-button type="primary" class="flex-1" :icon="Plus" :disabled="sending || streaming || waiting" @click="createNew">
              新建
            </el-button>
            <el-button
              :icon="Delete"
              :disabled="!conversations.length || sending || streaming || waiting"
              @click="clearAllSessions"
            >
              清空
            </el-button>
          </div>
          <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
            <button
              v-for="item in conversations"
              :key="item.id"
              type="button"
              class="nav-link w-full !items-start !py-2 text-left"
              :class="{ active: item.id === activeId }"
              @click="selectConversation(item.id)"
            >
              <span class="block truncate text-sm">{{ item.title }}</span>
              <span class="mt-1 block text-xs text-mist">{{ formatDate(item.updatedAt) }}</span>
            </button>
            <p v-if="!conversations.length" class="px-2 py-6 text-center text-sm text-mist">还没有会话，直接提问即可创建。</p>
          </div>
        </aside>

        <section class="flex min-h-0 flex-col overflow-hidden">
          <div ref="listRef" class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div v-if="msgLoading" class="py-8"><el-skeleton animated :rows="4" /></div>
            <template v-else-if="messages.length">
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex"
                :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-7 md:max-w-[75%]"
                  :class="msg.role === 'user' ? 'tutor-bubble-user' : 'bg-ink/60 text-paper/95'"
                >
                  <div v-if="msg.waiting" class="typing-dots" aria-label="正在思考">
                    <span /><span /><span />
                  </div>
                  <template v-else>
                    <p class="tutor-stream-text whitespace-pre-wrap">
                      <span>{{ msg.content }}</span><span
                        v-if="msg.pending || (streaming && String(msg.id).startsWith('tmp-'))"
                        class="tutor-caret"
                        aria-hidden="true"
                      />
                    </p>
                    <p v-if="msg.notice" class="mt-2 text-xs text-mist">{{ msg.notice }}</p>
                    <CaseRefCard v-if="msg.refCaseId && caseMap[msg.refCaseId]" :item="caseMap[msg.refCaseId]" />
                    <button
                      v-if="msg.role === 'assistant' && msg.content && !msg.pending && !msg.waiting"
                      type="button"
                      class="tutor-speak-btn mt-2 inline-flex items-center gap-1 text-xs text-teal hover:underline"
                      :disabled="loadingSpeech"
                      @click="replaySpeech(msg.content)"
                    >
                      <el-icon :size="14"><Headset /></el-icon>
                      {{ loadingSpeech || speaking ? '朗读中…' : '语音朗读' }}
                    </button>
                  </template>
                </div>
              </div>
            </template>
            <div v-else class="py-8 text-center">
              <p class="text-sm text-mist">从仿生机理问起。可以点下面的示例，或直接描述你的工况约束。</p>
              <div class="mx-auto mt-4 flex w-full max-w-xl flex-col items-stretch gap-2">
                <el-button
                  v-for="prompt in SUGGESTED_PROMPTS"
                  :key="prompt"
                  class="tutor-suggest-btn !ml-0 w-full justify-start whitespace-normal !h-auto py-2.5 text-left"
                  size="small"
                  plain
                  :disabled="sending || waiting"
                  @click.stop="send(String(prompt))"
                >
                  {{ prompt }}
                </el-button>
              </div>
            </div>
          </div>

          <div class="shrink-0 border-t border-[color:var(--bio-line)] p-3">
            <div class="flex gap-2">
              <el-input
                v-model="input"
                type="textarea"
                :rows="4"
                resize="none"
                placeholder="例如：潮湿车间里，干黏附足还能否做主承载？"
                @keydown.enter.exact.prevent="send()"
              />
              <el-button
                type="primary"
                class="btn-accent self-stretch !h-auto px-4"
                :loading="sending || streaming || waiting"
                :icon="Promotion"
                @click="send()"
              >
                发送
              </el-button>
            </div>
          </div>
        </section>
      </div>
    </StateView>
  </div>
</template>
