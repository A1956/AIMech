import { computed, ref } from 'vue'
import { createQuizAttempt, fetchQuizAttempts } from '@/api/quiz'
import { fetchQuestions } from '@/api/question'
import { gradeAnswers, pickQuestions } from '@/utils/quizEngine'

/** 抽题策略 */
export const PICK_STRATEGIES = [
  { value: 'unseen', label: '未做题优先' },
  { value: 'consolidate', label: '知识巩固优先' },
  { value: 'wrong_first', label: '优先做错题' },
]

/**
 * 从历史作答汇总：见过的题、错题次数、错题知识点权重
 * @param {import('@/types').QuizAttempt[]} attempts
 * @param {Map<number, object>} bankById
 */
const collectAttemptSignals = (attempts = [], bankById = new Map()) => {
  const seenIds = new Set()
  const wrongIdWeight = new Map()
  const wrongKpWeight = new Map()

  attempts.forEach((attempt) => {
    const details = attempt.detail || []
    details.forEach((d) => {
      if (d?.questionId != null) seenIds.add(d.questionId)
    })
    const wrongQuestionIds = attempt.wrongQuestionIds || []
    wrongQuestionIds.forEach((qid) => {
      seenIds.add(qid)
      wrongIdWeight.set(qid, (wrongIdWeight.get(qid) || 0) + 1)
      const kp = bankById.get(qid)?.knowledgePoint
      if (kp) wrongKpWeight.set(kp, (wrongKpWeight.get(kp) || 0) + 1)
    })
  })

  return { seenIds, wrongIdWeight, wrongKpWeight }
}

/**
 * 按策略重排题目（不改教师组卷，仅调整作答顺序；同分保持相对顺序）
 * @param {object[]} questions
 * @param {'unseen' | 'consolidate' | 'wrong_first'} strategy
 * @param {import('@/types').QuizAttempt[]} attempts
 * @param {object[]} bank
 */
export const reorderQuestionsByStrategy = (
  questions = [],
  strategy = 'unseen',
  attempts = [],
  bank = [],
) => {
  if (!questions.length) return questions

  const bankById = new Map([...bank, ...questions].map((q) => [q.id, q]))
  const { seenIds, wrongIdWeight, wrongKpWeight } = collectAttemptSignals(attempts, bankById)

  const scored = questions.map((q, index) => {
    if (strategy === 'wrong_first') {
      // 仅把历史错题置前，做错次数越高越靠前
      const wrongHits = wrongIdWeight.get(q.id) || 0
      return { q, index, rank: wrongHits > 0 ? -wrongHits : 1 }
    }
    if (strategy === 'consolidate') {
      const wrongHits = wrongIdWeight.get(q.id) || 0
      const kpHits = wrongKpWeight.get(q.knowledgePoint) || 0
      // 错题本身优先，其次同知识点薄弱题
      return { q, index, rank: -(wrongHits * 1000 + kpHits) }
    }
    // 未见过的置前，已出现过的置后
    return { q, index, rank: seenIds.has(q.id) ? 1 : 0 }
  })

  scored.sort((a, b) => a.rank - b.rank || a.index - b.index)
  return scored.map((item) => item.q)
}

/** 学生自测 / 选卷：抽题、作答、交卷落库 */
export const useQuiz = () => {
  const loading = ref(false)
  const submitting = ref(false)
  const bank = ref([])
  const paper = ref([])
  const answers = ref({})
  const result = ref(null)
  const startedAt = ref(0)
  /** 当前作答的试卷元数据（选卷模式） */
  const activePaper = ref(null)

  const answeredCount = computed(
    () => paper.value.filter((item) => Boolean(answers.value[item.id])).length,
  )

  const loadBank = async (params = {}) => {
    loading.value = true
    try {
      bank.value = await fetchQuestions(params)
      return bank.value
    } finally {
      loading.value = false
    }
  }

  const startSelfQuiz = async ({ subject, difficulty, count }) => {
    result.value = null
    answers.value = {}
    activePaper.value = null
    if (!bank.value.length) await loadBank()
    paper.value = pickQuestions(bank.value, { subject, difficulty, count })
    startedAt.value = Date.now()
    return paper.value
  }

  /**
   * 按教师发布试卷进入答题；可按抽题策略重排 questionIds 对应题目
   * @param {object} examPaper
   * @param {object[] | { questions?: object[], strategy?: string, userId?: number }} questionsOrOpts
   */
  const startFromPaper = async (examPaper, questionsOrOpts) => {
    const opts = Array.isArray(questionsOrOpts)
      ? { questions: questionsOrOpts }
      : questionsOrOpts || {}
    const { questions, strategy = 'unseen', userId } = opts

    result.value = null
    answers.value = {}
    activePaper.value = examPaper || null

    let list = []
    if (questions?.length) {
      list = [...questions]
    } else {
      if (!bank.value.length) await loadBank()
      const byId = new Map(bank.value.map((q) => [q.id, q]))
      list = (examPaper?.questionIds || []).map((id) => byId.get(id)).filter(Boolean)
    }

    if (list.length && userId != null) {
      const attempts = await fetchQuizAttempts({ userId }, { silent: true }).catch(() => [])
      list = reorderQuestionsByStrategy(list, strategy, attempts, bank.value)
    }

    paper.value = list
    startedAt.value = Date.now()
    return paper.value
  }

  const setAnswer = (questionId, value) => {
    answers.value = { ...answers.value, [questionId]: value }
  }

  const submit = async ({ userId, subject, paperId = null, mode = 'self' } = {}) => {
    if (!paper.value.length || submitting.value) return null
    submitting.value = true
    try {
      const resolvedPaperId = paperId ?? activePaper.value?.id ?? null
      const resolvedMode = mode || (resolvedPaperId ? 'assigned' : 'self')
      const scoreTotal = resolvedMode === 'assigned' ? Number(activePaper.value?.scoreTotal) : 0
      const graded = gradeAnswers(
        paper.value,
        answers.value,
        scoreTotal > 0 ? { totalScore: scoreTotal } : {},
      )
      const durationSec = Math.max(1, Math.round((Date.now() - startedAt.value) / 1000))
      const subjectLabel =
        subject ||
        (activePaper.value?.subjects?.length ? activePaper.value.subjects.join('、') : '综合')
      const payload = {
        userId,
        paperId: resolvedPaperId,
        mode: resolvedMode,
        subject: subjectLabel === '全部' ? '综合' : subjectLabel,
        score: graded.score,
        total: graded.total,
        correctCount: graded.correctCount,
        questionCount: graded.questionCount,
        wrongQuestionIds: graded.wrongQuestionIds,
        detail: graded.detail,
        durationSec,
        createdAt: new Date().toISOString(),
      }
      const saved = await createQuizAttempt(payload)
      result.value = {
        ...graded,
        durationSec,
        attemptId: saved.id,
        questions: paper.value,
      }
      return result.value
    } finally {
      submitting.value = false
    }
  }

  const reset = () => {
    paper.value = []
    answers.value = {}
    result.value = null
    startedAt.value = 0
    activePaper.value = null
  }

  return {
    loading,
    submitting,
    bank,
    paper,
    answers,
    result,
    answeredCount,
    activePaper,
    loadBank,
    startSelfQuiz,
    startFromPaper,
    setAnswer,
    submit,
    reset,
  }
}
