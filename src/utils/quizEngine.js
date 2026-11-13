/** 洗牌后取前 n 项 */
export const shufflePick = (list = [], count = 5) => {
  const pool = [...list]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)))
}

/**
 * 按科目 / 难度 / 章节 / 题型筛选并随机抽题。
 * difficulty / chapter / questionType 为「全部」时不过滤。
 */
export const pickQuestions = (
  bank = [],
  { subject, difficulty, count = 5, chapter, questionType } = {},
) => {
  const filtered = bank.filter((item) => {
    const subjectOk = !subject || subject === '全部' || item.subject === subject
    const diffOk = !difficulty || difficulty === '全部' || item.difficulty === difficulty
    const chapterOk = !chapter || chapter === '全部' || item.knowledgePoint === chapter
    const typeOk = !questionType || questionType === '全部' || item.type === questionType
    return subjectOk && diffOk && chapterOk && typeOk
  })
  return shufflePick(filtered, count)
}

/** 判分并汇总错题；指定总分时按题目正确率折算为试卷分值 */
export const gradeAnswers = (questions = [], answers = {}, { totalScore } = {}) => {
  const detail = questions.map((q) => {
    const selected = answers[q.id] ?? ''
    const correct = selected === q.answer
    return { questionId: q.id, selected, correct }
  })
  const correctCount = detail.filter((item) => item.correct).length
  const hasScoreTotal = Number.isFinite(Number(totalScore)) && Number(totalScore) > 0
  const total = hasScoreTotal ? Number(totalScore) : questions.length
  const rawScore = hasScoreTotal && questions.length
    ? (correctCount / questions.length) * total
    : correctCount
  const score = Math.round(rawScore * 100) / 100
  const wrongQuestionIds = detail.filter((item) => !item.correct).map((item) => item.questionId)
  const wrongKnowledge = [
    ...new Set(
      questions
        .filter((q) => wrongQuestionIds.includes(q.id))
        .map((q) => q.knowledgePoint),
    ),
  ]
  return {
    score,
    total,
    correctCount,
    questionCount: questions.length,
    detail,
    wrongQuestionIds,
    wrongKnowledge,
  }
}

/** 从题目列表按科目占比尽量均匀抽题（组卷）；可叠加章节 / 题型 */
export const composePaperQuestions = (
  bank = [],
  { subjects = [], difficulty, count = 6, chapter, questionType } = {},
) => {
  const requestedCount = Math.max(5, Math.floor(Number(count) || 5))
  const scoped = bank.filter((item) => {
    const chapterOk = !chapter || chapter === '全部' || item.knowledgePoint === chapter
    const typeOk = !questionType || questionType === '全部' || item.type === questionType
    return chapterOk && typeOk
  })
  const subjectList = subjects.length ? subjects : [...new Set(scoped.map((item) => item.subject))]
  if (!subjectList.length) return []

  const diff = difficulty === '混合' ? '全部' : difficulty
  const per = Math.floor(requestedCount / subjectList.length)
  let remain = requestedCount - per * subjectList.length
  const picked = []

  subjectList.forEach((subject) => {
    const need = per + (remain > 0 ? 1 : 0)
    if (remain > 0) remain -= 1
    const chunk = pickQuestions(scoped, {
      subject,
      difficulty: diff,
      count: need,
      chapter,
      questionType,
    })
    picked.push(...chunk)
  })

  if (picked.length < requestedCount) {
    const ids = new Set(picked.map((item) => item.id))
    const extra = pickQuestions(
      scoped.filter((item) => !ids.has(item.id)),
      {
        subject: '全部',
        difficulty: diff,
        count: requestedCount - picked.length,
        chapter,
        questionType,
      },
    )
    picked.push(...extra)
  }

  return shufflePick(picked, requestedCount)
}
