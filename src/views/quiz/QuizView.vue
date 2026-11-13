<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchPapers } from '@/api/paper'
import QuizClock from '@/components/business/QuizClock.vue'
import BackToTop from '@/components/common/BackToTop.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StateView from '@/components/common/StateView.vue'
import { useAuth } from '@/composables/useAuth'
import { usePoints } from '@/composables/usePoints'
import { PICK_STRATEGIES, useQuiz } from '@/composables/useQuiz'
import { POINTS_RULES } from '@/types/points'
import { formatDate } from '@/utils/format'

const { profile } = useAuth()
const { earn } = usePoints()
const {
  loading,
  submitting,
  paper,
  answers,
  result,
  answeredCount,
  activePaper,
  loadBank,
  startFromPaper,
  setAnswer,
  submit,
  reset,
} = useQuiz()

const error = ref('')
const phase = ref('setup') // setup | answering | result
const papers = ref([])
const startedAt = ref(0)
const timedOut = ref(false)
const clockRef = ref(null)
const navOpen = ref(true)
const pickStrategy = ref('unseen')
const PAPER_INITIAL = 2
const visiblePaperCount = ref(PAPER_INITIAL)
const paperSentinelRef = ref(null)
let paperObserver = null

const visiblePapers = computed(() => papers.value.slice(0, visiblePaperCount.value))
const hasMorePapers = computed(() => visiblePaperCount.value < papers.value.length)

const revealNextPaper = () => {
  if (!hasMorePapers.value) return
  visiblePaperCount.value = Math.min(visiblePaperCount.value + 1, papers.value.length)
}

const setupPaperSentinel = () => {
  if (paperObserver) {
    paperObserver.disconnect()
    paperObserver = null
  }
  if (!paperSentinelRef.value || typeof IntersectionObserver === 'undefined') return
  paperObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) revealNextPaper()
    },
    { root: null, rootMargin: '80px 0px', threshold: 0.05 },
  )
  paperObserver.observe(paperSentinelRef.value)
}

const headerNow = ref(Date.now())
let headerTimer = null
const pad = (n) => String(n).padStart(2, '0')
const headerClockText = computed(() => {
  const d = new Date(headerNow.value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const limitSec = computed(() => {
  const min = Number(activePaper.value?.durationMin) || 20
  return Math.max(60, min * 60)
})

const progressText = computed(() => `${answeredCount.value} / ${paper.value.length}`)

const isExpired = (item) => {
  if (!item?.deadline) return false
  const t = new Date(item.deadline).getTime()
  return !Number.isNaN(t) && t < Date.now()
}

const pageSize = ref(1)
const pageIndex = ref(0)
let mq = null
const onMqChange = () => syncPageSize()

const syncPageSize = () => {
  const next = window.matchMedia('(min-width: 768px)').matches ? 2 : 1
  if (next === pageSize.value) return
  const firstQ = pageIndex.value * pageSize.value
  pageSize.value = next
  pageIndex.value = Math.floor(firstQ / next)
}

const totalPages = computed(() => Math.max(1, Math.ceil(paper.value.length / pageSize.value)))

const pageQuestions = computed(() => {
  const start = pageIndex.value * pageSize.value
  return paper.value.slice(start, start + pageSize.value).map((q, i) => ({
    q,
    globalIndex: start + i,
  }))
})

const canPrev = computed(() => pageIndex.value > 0)
const canNext = computed(() => pageIndex.value < totalPages.value - 1)

const goPrev = () => {
  if (!canPrev.value) return
  pageIndex.value -= 1
}

const goNext = () => {
  if (!canNext.value) return
  pageIndex.value += 1
}

const jumpToQuestion = (qIndex) => {
  pageIndex.value = Math.floor(qIndex / pageSize.value)
}

watch(totalPages, (pages) => {
  if (pageIndex.value > pages - 1) pageIndex.value = Math.max(0, pages - 1)
})

const startPaper = async (item) => {
  if (isExpired(item)) {
    ElMessage.warning('该卷已过截止时间，无法作答')
    return
  }
  error.value = ''
  timedOut.value = false
  pageIndex.value = 0
  try {
    const list = await startFromPaper(item, {
      strategy: pickStrategy.value,
      userId: profile.value?.id,
    })
    if (!list.length) {
      ElMessage.warning('试卷题目缺失或题库未同步，请联系教师')
      return
    }
    if (list.length < 5) {
      reset()
      ElMessage.warning('该检测卷不足 5 题，请联系教师补足题目后重新发布')
      return
    }
    startedAt.value = Date.now()
    phase.value = 'answering'
  } catch (err) {
    error.value = err.userMessage || '进入试卷失败'
  }
}

const finishSubmit = async ({ auto = false } = {}) => {
  if (submitting.value || phase.value !== 'answering') return
  try {
    await submit({
      userId: profile.value.id,
      subject: (activePaper.value?.subjects || []).join('、') || '综合',
      mode: 'assigned',
      paperId: activePaper.value?.id ?? null,
    })
    phase.value = 'result'
    startedAt.value = 0
    await earn({ amount: POINTS_RULES.quizComplete, reason: '完成答题智测' })
    if (auto) {
      ElMessage.warning(`时间到，已自动交卷 · +${POINTS_RULES.quizComplete} 积分`)
    } else {
      ElMessage.success(`已交卷，记录已写入学情 · +${POINTS_RULES.quizComplete} 积分`)
    }
  } catch (err) {
    ElMessage.error(err.userMessage || '交卷失败')
  }
}

const onSubmit = async () => {
  if (answeredCount.value < paper.value.length) {
    ElMessage.warning('还有未作答题目')
    return
  }
  await finishSubmit({ auto: false })
}

const onTimeout = async () => {
  if (timedOut.value || phase.value !== 'answering') return
  timedOut.value = true
  await finishSubmit({ auto: true })
}

const again = () => {
  reset()
  startedAt.value = 0
  timedOut.value = false
  pageIndex.value = 0
  phase.value = 'setup'
}

const load = async () => {
  error.value = ''
  try {
    await loadBank()
    papers.value = await fetchPapers({}, { silent: true }).catch(() => [])
    visiblePaperCount.value = PAPER_INITIAL
    await nextTick()
    setupPaperSentinel()
  } catch (err) {
    error.value = err.userMessage || '题库加载失败'
  }
}

watch(hasMorePapers, async () => {
  await nextTick()
  setupPaperSentinel()
})

watch(phase, async (next) => {
  if (next === 'setup') {
    await nextTick()
    setupPaperSentinel()
  }
})

const detailMap = computed(() => {
  if (!result.value) return {}
  return Object.fromEntries(result.value.detail.map((item) => [item.questionId, item]))
})

onMounted(() => {
  load()
  syncPageSize()
  mq = window.matchMedia('(min-width: 768px)')
  if (mq.addEventListener) mq.addEventListener('change', onMqChange)
  else mq.addListener(onMqChange)
  headerTimer = setInterval(() => {
    headerNow.value = Date.now()
  }, 250)
})

onUnmounted(() => {
  startedAt.value = 0
  if (headerTimer) clearInterval(headerTimer)
  if (mq) {
    if (mq.removeEventListener) mq.removeEventListener('change', onMqChange)
    else mq.removeListener(onMqChange)
  }
  if (paperObserver) {
    paperObserver.disconnect()
    paperObserver = null
  }
})
</script>

<template>
  <div>
    <BackToTop :threshold="220" />
    <PageHeader
      title="答题智测"
      subtitle="选择教师发布的检测卷作答；截止后不可进入。答题中分页作答，交卷写入智能学情并获得积分。"
    >
      <span
        v-if="phase !== 'answering'"
        class="quiz-header-clock text-base text-mist tabular-nums"
        aria-label="今日日期时间"
      >
        {{ headerClockText }}
      </span>
    </PageHeader>

    <StateView :loading="loading && phase === 'setup'" :error="error" @retry="load">
      <template #loading>
        <div class="bio-card p-5"><el-skeleton animated :rows="6" /></div>
      </template>

      <section v-if="phase === 'setup'" class="space-y-3">
        <div class="quiz-setup-banner bio-card px-4 py-3">
          <div class="flex flex-col items-center text-center">
            <h2 class="text-base font-semibold leading-tight text-paper">选择检测卷</h2>
            <p class="mt-0.5 text-sm leading-snug text-mist">
              组卷条件由教师配置；选卷后按策略智能调整题目顺序。
            </p>
            <p class="mt-2 text-sm font-medium text-teal">抽题策略</p>
            <el-radio-group
              v-model="pickStrategy"
              class="pick-strategy-group mt-1.5 flex w-full max-w-2xl flex-nowrap items-center justify-between gap-2"
            >
              <el-radio
                v-for="opt in PICK_STRATEGIES"
                :key="opt.value"
                :value="opt.value"
                class="pick-strategy-chip"
                :class="`tone-${opt.value}`"
              >
                {{ opt.label }}
              </el-radio>
            </el-radio-group>
          </div>
        </div>

        <StateView
          :loading="false"
          :empty="!papers.length"
          empty-title="暂无检测卷"
          empty-text="请等待教师在智能教学台发布试卷。"
        >
          <ul class="grid gap-4 md:grid-cols-2">
            <li
              v-for="(item, index) in visiblePapers"
              :key="item.id"
              class="quiz-paper-card quiz-paper-card--lg bio-card flex flex-col p-5 md:p-6 transition paper-reveal is-shown"
              :class="[
                `tone-${index % 4}`,
                isExpired(item) ? 'is-expired' : 'can-lift',
              ]"
            >
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-lg font-semibold text-paper md:text-xl">{{ item.title }}</h3>
                <span
                  v-if="isExpired(item)"
                  class="shrink-0 rounded-md bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-400"
                >
                  已过期
                </span>
                <span
                  v-else
                  class="quiz-paper-badge shrink-0 rounded-md px-2.5 py-1 text-xs font-medium"
                >
                  {{ item.difficulty || '检测' }}
                </span>
              </div>
              <p class="mt-3 text-[0.95rem] text-mist">
                <span class="quiz-paper-subject">{{ (item.subjects || []).join('、') || '综合' }}</span>
                <span v-if="item.scoreTotal"> · 总分 {{ item.scoreTotal }}</span>
              </p>
              <p class="mt-1.5 text-[0.95rem] text-mist">
                时长 {{ item.durationMin }} 分钟
                <span v-if="item.chapter && item.chapter !== '全部'"> · {{ item.chapter }}</span>
              </p>
              <p class="mt-3 text-[0.95rem]" :class="isExpired(item) ? 'text-red-300' : 'text-sand'">
                截止 {{ formatDate(item.deadline) }}
              </p>
              <el-button
                v-if="isExpired(item)"
                class="btn-expired-grey mt-5 self-start"
                type="info"
                plain
                disabled
                size="large"
              >
                已过期
              </el-button>
              <el-button
                v-else
                type="primary"
                class="btn-accent mt-5 self-start"
                size="large"
                @click="startPaper(item)"
              >
                智能抽题
              </el-button>
            </li>
          </ul>
          <div ref="paperSentinelRef" class="h-10" aria-hidden="true" />
          <p v-if="hasMorePapers" class="mt-1 text-center text-xs text-mist">继续下滑显示更多试卷…</p>
          <p v-else-if="papers.length" class="mt-1 text-center text-xs text-mist">
            已显示全部 {{ papers.length }} 份试卷
          </p>
        </StateView>
      </section>

      <section v-else-if="phase === 'answering'" class="space-y-4">
        <div class="bio-card space-y-3 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-mist">
              {{ activePaper?.title || '检测卷' }} · 已答 {{ progressText }}
            </p>
            <div class="flex gap-2">
              <el-button plain @click="again">放弃重选</el-button>
              <el-button type="primary" class="btn-accent" :loading="submitting" @click="onSubmit">
                交卷
              </el-button>
            </div>
          </div>
          <QuizClock
            ref="clockRef"
            :running="true"
            :started-at="startedAt"
            :limit-sec="limitSec"
            @timeout="onTimeout"
          />
        </div>

        <div class="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div class="space-y-4">
            <article
              v-for="{ q, globalIndex } in pageQuestions"
              :key="q.id"
              class="bio-card p-5"
            >
              <p class="text-xs text-mist">
                第 {{ globalIndex + 1 }} 题 · {{ q.subject }} · {{ q.difficulty }} · {{ q.knowledgePoint }}
              </p>
              <h3 class="mt-2 text-base font-semibold leading-7">{{ q.stem }}</h3>
              <el-radio-group
                class="mt-4 flex flex-col items-start gap-2"
                :model-value="answers[q.id]"
                @change="(val) => setAnswer(q.id, val)"
              >
                <el-radio
                  v-for="opt in q.options"
                  :key="opt"
                  :value="opt"
                  class="!mr-0 whitespace-normal text-left"
                >
                  {{ opt }}
                </el-radio>
              </el-radio-group>
            </article>

            <div class="bio-card flex flex-wrap items-center justify-between gap-3 p-4">
              <el-button :disabled="!canPrev" @click="goPrev">上一题</el-button>
              <p class="text-sm text-mist">
                第 {{ pageIndex + 1 }} / {{ totalPages }} 页 · 每页 {{ pageSize }} 题
              </p>
              <el-button :disabled="!canNext" type="primary" @click="goNext">下一题</el-button>
            </div>
          </div>

          <aside class="bio-card h-fit p-3 lg:w-44">
            <button
              type="button"
              class="mb-2 flex w-full items-center justify-between text-xs text-mist md:pointer-events-none"
              @click="navOpen = !navOpen"
            >
              <span>题号跳转</span>
              <span class="md:hidden">{{ navOpen ? '收起' : '展开' }}</span>
            </button>
            <div
              class="flex flex-wrap gap-2"
              :class="navOpen ? '' : 'hidden md:flex'"
            >
              <button
                v-for="(q, index) in paper"
                :key="q.id"
                type="button"
                class="h-8 w-8 rounded-lg text-xs font-medium transition"
                :class="[
                  answers[q.id]
                    ? 'bg-accent/25 text-accent'
                    : 'bg-ink/50 text-mist hover:text-paper',
                  Math.floor(index / pageSize) === pageIndex
                    ? 'ring-1 ring-accent/60'
                    : '',
                ]"
                @click="jumpToQuestion(index)"
              >
                {{ index + 1 }}
              </button>
            </div>
          </aside>
        </div>
      </section>

      <section v-else-if="phase === 'result' && result" class="space-y-4">
        <div class="bio-card p-5">
          <h2 class="text-xl font-semibold">得分 {{ result.score }} / {{ result.total }}</h2>
          <p class="mt-2 text-sm text-mist">
            {{ activePaper?.title ? `${activePaper.title} · ` : '' }}用时 {{ result.durationSec }} 秒
            · 答对 {{ result.correctCount }} / {{ result.questionCount }} 题
            <span v-if="timedOut"> · 超时自动交卷</span>
            <span v-if="result.wrongKnowledge.length">
              · 薄弱知识点：{{ result.wrongKnowledge.join('、') }}
            </span>
          </p>
          <el-button class="mt-4" type="primary" @click="again">返回选卷</el-button>
        </div>

        <article v-for="(q, index) in result.questions" :key="q.id" class="bio-card p-5">
          <p class="text-xs text-mist">第 {{ index + 1 }} 题 · {{ q.knowledgePoint }}</p>
          <h3 class="mt-2 font-semibold">{{ q.stem }}</h3>
          <p class="mt-2 text-sm" :class="detailMap[q.id]?.correct ? 'text-accent' : 'text-red-300'">
            你的答案：{{ detailMap[q.id]?.selected || '未答' }}
            · 标准答案：{{ q.answer }}
          </p>
          <p class="mt-2 text-sm leading-7 text-mist">解析：{{ q.analysis }}</p>
        </article>
      </section>
    </StateView>
  </div>
</template>
