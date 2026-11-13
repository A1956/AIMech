/**
 * 合并种子高频问题与真实助教提问，生成教师看板数据。
 * @param {Array} seedStats
 * @param {Array} messages
 */
export const mergeHotQuestions = (seedStats = [], messages = []) => {
  const map = new Map()

  seedStats.forEach((item) => {
    map.set(item.question, {
      question: item.question,
      topic: item.topic,
      caseId: item.caseId,
      count: Number(item.count || 0),
      lastAskedAt: item.lastAskedAt,
      source: 'seed',
    })
  })

  messages
    .filter((item) => item.role === 'user' && item.content?.trim())
    .forEach((item) => {
      const question = item.content.trim()
      const prev = map.get(question)
      if (prev) {
        prev.count += 1
        prev.lastAskedAt = item.createdAt
        prev.source = 'mixed'
      } else {
        map.set(question, {
          question,
          topic: '课堂即时提问',
          caseId: item.refCaseId || null,
          count: 1,
          lastAskedAt: item.createdAt,
          source: 'live',
        })
      }
    })

  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8)
}

/** 按观看量从低到高统计教学视频 */
export const rankHotVideos = (videos = []) =>
  [...videos].sort((a, b) => Number(a.views || 0) - Number(b.views || 0)).slice(0, 8)

/**
 * 用学生路径完成率交叉校验薄弱知识点。
 * @param {Array} weakness
 * @param {Array} students
 * @param {Array} courses
 */
export const enrichWeakPoints = (weakness = [], students = [], courses = []) => {
  const studentList = students.filter((item) => item.role === 'student')
  const total = studentList.length || 1
  const courseMap = Object.fromEntries(courses.map((item) => [item.id, item]))

  return [...weakness]
    .map((item) => {
      const done = studentList.filter((stu) =>
        (stu.progress?.completedCourseIds || []).includes(item.courseId),
      ).length
      const completionRate = done / total
      const courseTitle = courseMap[item.courseId]?.title || `课程 #${item.courseId}`
      return {
        ...item,
        courseTitle,
        completionRate,
        /** 完成率越低、标注薄弱率越高，优先级越高 */
        priority: Number(item.weakRate || 0) * 0.65 + (1 - completionRate) * 0.35,
      }
    })
    .sort((a, b) => b.priority - a.priority)
}

const chartTone = () => {
  const style = getComputedStyle(document.documentElement)
  return {
    axis: style.getPropertyValue('--bio-chart-axis').trim() || '#5E7388',
    label: style.getPropertyValue('--bio-chart-text').trim() || '#1B2A37',
    split: style.getPropertyValue('--bio-chart-split').trim() || 'rgba(94,115,136,0.18)',
    teal: style.getPropertyValue('--bio-teal').trim() || '#0E7C86',
    accent: style.getPropertyValue('--bio-accent').trim() || '#1FA97A',
    sand: style.getPropertyValue('--bio-sand').trim() || '#D08B2C',
    mist: style.getPropertyValue('--bio-mist').trim() || '#5E7388',
  }
}

export const buildQuestionBarOption = (list = []) => {
  const tone = chartTone()
  return {
    color: [tone.teal],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 18, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: tone.axis },
      splitLine: { lineStyle: { color: tone.split } },
    },
    yAxis: {
      type: 'category',
      data: list.map((item) => (item.question.length > 18 ? `${item.question.slice(0, 18)}…` : item.question)).reverse(),
      axisLabel: { color: tone.label, width: 140, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: list.map((item) => item.count).reverse(),
        barWidth: 14,
        itemStyle: { borderRadius: [0, 8, 8, 0] },
      },
    ],
  }
}

export const buildVideoBarOption = (list = []) => {
  const tone = chartTone()
  return {
    color: [tone.accent],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 18, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: list.map((item) => item.title.replace(/：.*/, '')),
      axisLabel: { color: tone.axis, interval: 0, rotate: 28 },
    },
    yAxis: {
      type: 'value',
      name: '观看',
      axisLabel: { color: tone.axis },
      splitLine: { lineStyle: { color: tone.split } },
    },
    series: [
      {
        type: 'bar',
        data: list.map((item) => item.views),
        barWidth: 18,
        itemStyle: { borderRadius: [8, 8, 0, 0] },
      },
    ],
  }
}

export const buildWeakPieOption = (list = []) => {
  const tone = chartTone()
  return {
    color: [tone.teal, tone.accent, '#4A90A4', tone.sand, tone.mist],
    tooltip: { trigger: 'item', formatter: '{b}<br/>薄弱指数 {d}%' },
    legend: {
      bottom: 0,
      textStyle: { color: tone.axis },
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        label: { color: tone.label, formatter: '{b}' },
        data: list.map((item) => ({
          name: item.knowledgePoint,
          value: Math.round(Number(item.weakRate || 0) * 100),
        })),
      },
    ],
  }
}

/**
 * 从作答记录聚合高频错题。
 * @param {Array} attempts
 * @param {Array} questions
 */
export const aggregateHotWrongQuestions = (attempts = [], questions = []) => {
  const qMap = Object.fromEntries(questions.map((item) => [item.id, item]))
  const counter = new Map()

  attempts.forEach((attempt) => {
    ;(attempt.wrongQuestionIds || []).forEach((qid) => {
      const prev = counter.get(qid) || {
        questionId: qid,
        wrongCount: 0,
        stem: qMap[qid]?.stem || `题目 #${qid}`,
        knowledgePoint: qMap[qid]?.knowledgePoint || '未标注',
        subject: qMap[qid]?.subject || '综合',
      }
      prev.wrongCount += 1
      counter.set(qid, prev)
    })
  })

  return [...counter.values()].sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 10)
}

/** 教学时长：课程节点总分钟 + 视频片库总分钟 */
export const summarizeTeachingDuration = (courses = [], videos = []) => {
  const courseMinutes = courses.reduce((sum, item) => sum + Number(item.duration || 0), 0)
  const videoMinutes = videos.reduce((sum, item) => sum + Number(item.durationMin || 0), 0)
  return {
    courseMinutes,
    videoMinutes,
    totalMinutes: courseMinutes + videoMinutes,
    courseHours: Math.round((courseMinutes / 60) * 10) / 10,
    videoHours: Math.round((videoMinutes / 60) * 10) / 10,
  }
}

export const buildWrongBarOption = (list = []) => {
  const tone = chartTone()
  return {
    color: [tone.sand],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 18, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      name: '错次',
      axisLabel: { color: tone.axis },
      splitLine: { lineStyle: { color: tone.split } },
    },
    yAxis: {
      type: 'category',
      data: list
        .map((item) => (item.stem.length > 16 ? `${item.stem.slice(0, 16)}…` : item.stem))
        .reverse(),
      axisLabel: { color: tone.label, width: 130, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: list.map((item) => item.wrongCount).reverse(),
        barWidth: 14,
        itemStyle: { borderRadius: [0, 8, 8, 0] },
      },
    ],
  }
}
