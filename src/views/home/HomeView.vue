<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchCases } from '@/api/case'
import { fetchCourses } from '@/api/course'
import { fetchUser, fetchUsers } from '@/api/user'
import AppleCarousel from '@/components/business/AppleCarousel.vue'
import CaseCard from '@/components/business/CaseCard.vue'
import StudyChart from '@/components/business/StudyChart.vue'
import HeroMedia from '@/components/common/HeroMedia.vue'
import SmartIcon from '@/components/common/SmartIcon.vue'
import StateView from '@/components/common/StateView.vue'
import { useAuth } from '@/composables/useAuth'
import { usePermission } from '@/composables/usePermission'
import { useTheme } from '@/composables/useTheme'
import { useUserStore } from '@/stores/user'
import { PAGE_TITLES, SHORTCUT_COPY } from '@/types/labels'
import { formatDay, peerName, sumMinutes } from '@/utils/format'
import patternUrl from '@/assets/illustrations/pattern-honeycomb.svg'

const route = useRoute()
const { profile } = useAuth()
const userStore = useUserStore()
const { isTeacher, isStudent } = usePermission()
const { theme } = useTheme()

const loading = ref(true)
const error = ref('')
const cases = ref([])
const courses = ref([])
const students = ref([])
const rankingPeriod = ref('today')
const dailyGoalMinutes = ref(90)

const HERO_LINES = [
  '用生物机理，做可校核的机械创新',
  '每天登录可领取积分',
  '小智让学与问无缝连接!',
]
const heroLineIndex = ref(0)
const heroLine = computed(() => HERO_LINES[heroLineIndex.value] || HERO_LINES[0])
let heroLineTimer = null

const startHeroLineRotate = () => {
  if (heroLineTimer) return
  heroLineTimer = setInterval(() => {
    heroLineIndex.value = (heroLineIndex.value + 1) % HERO_LINES.length
  }, 3200)
}

const welcomeStorageKey = () => `bio-welcome-shown.${profile.value?.id || 'guest'}`

const tryShowWelcome = () => {
  if (!isStudent.value || !profile.value?.id) return
  try {
    if (sessionStorage.getItem(welcomeStorageKey())) return
    sessionStorage.setItem(welcomeStorageKey(), '1')
  } catch {
    /* 仍展示一次提示 */
  }
  ElMessage({
    type: 'success',
    message: `${PAGE_TITLES.home} · 欢迎回来，${peerName(profile.value?.name)}`,
    duration: 2800,
    showClose: false,
  })
}

const completedIds = computed(() => profile.value?.progress?.completedCourseIds || [])
const progressPercent = computed(() => {
  if (!courses.value.length) return 0
  return (completedIds.value.length / courses.value.length) * 100
})
const studyMinutes = computed(() => sumMinutes(profile.value?.progress?.studyLog || []))
const todayStudyMinutes = computed(() => {
  const today = formatDay(new Date())
  return (profile.value?.progress?.studyLog || [])
    .filter((item) => item.date === today)
    .reduce((total, item) => total + Number(item.minutes || 0), 0)
})
const dailyGoalPercent = computed(() =>
  dailyGoalMinutes.value > 0
    ? Math.min(100, Math.round((todayStudyMinutes.value / dailyGoalMinutes.value) * 100))
    : 0,
)
const todayCases = computed(() => [...cases.value].sort((a, b) => b.views - a.views).slice(0, 3))
const carouselCovers = computed(() => cases.value.slice(0, 4).map((item) => item.cover).filter(Boolean))

const dailyGoalStorageKey = () => `bio-daily-study-goal.${profile.value?.id || 'guest'}`

const loadDailyGoal = () => {
  if (!profile.value?.id) return
  try {
    const savedGoal = Number(localStorage.getItem(dailyGoalStorageKey()))
    dailyGoalMinutes.value = Number.isFinite(savedGoal) && savedGoal > 0 ? savedGoal : 90
  } catch {
    dailyGoalMinutes.value = 90
    ElMessage.warning('无法读取本地学习目标，已使用默认目标 90 分钟')
  }
}

const saveDailyGoal = (value) => {
  const goal = Number(value)
  if (!profile.value?.id || !Number.isFinite(goal) || goal <= 0) return
  dailyGoalMinutes.value = Math.round(goal)
  try {
    localStorage.setItem(dailyGoalStorageKey(), String(dailyGoalMinutes.value))
    ElMessage.success(`今日学习目标已设为 ${dailyGoalMinutes.value} 分钟`)
  } catch {
    ElMessage.error('学习目标保存失败，请检查浏览器本地存储设置')
  }
}

const shortcutTone = [
  { bg: 'rgba(14,124,134,0.14)', border: 'rgba(14,124,134,0.45)', shadow: 'rgba(14,124,134,0.28)' },
  { bg: 'rgba(208,139,44,0.14)', border: 'rgba(208,139,44,0.5)', shadow: 'rgba(208,139,44,0.28)' },
  { bg: 'rgba(31,169,122,0.14)', border: 'rgba(31,169,122,0.5)', shadow: 'rgba(31,169,122,0.28)' },
  { bg: 'rgba(58,123,168,0.14)', border: 'rgba(58,123,168,0.5)', shadow: 'rgba(58,123,168,0.28)' },
  { bg: 'rgba(94,115,136,0.16)', border: 'rgba(94,115,136,0.5)', shadow: 'rgba(94,115,136,0.25)' },
]

const shortcuts = computed(() => {
  if (isTeacher.value) {
    const copy = SHORTCUT_COPY.teacher
    return [
      { to: '/admin?tab=insights', ...copy.insights, icon: 'admin' },
      { to: '/admin?tab=questions', ...copy.questions, icon: 'quiz' },
      { to: '/admin?tab=papers', ...copy.papers, icon: 'design' },
      { to: '/admin?tab=cases', ...copy.cases, icon: 'cases' },
    ].map((item, index) => ({ ...item, tone: shortcutTone[index % shortcutTone.length] }))
  }
  const copy = SHORTCUT_COPY.student
  return [
    { to: '/tutor', ...copy.tutor, icon: 'tutor' },
    { to: '/cases', ...copy.cases, icon: 'cases' },
    { to: '/quiz', ...copy.quiz, icon: 'quiz' },
    { to: '/design', ...copy.design, icon: 'design' },
    { to: '/path', ...copy.path, icon: 'path' },
  ].map((item, index) => ({ ...item, tone: shortcutTone[index % shortcutTone.length] }))
})

const chartTone = () => {
  const style = getComputedStyle(document.documentElement)
  return {
    axis: style.getPropertyValue('--bio-chart-axis').trim() || '#5E7388',
    label: style.getPropertyValue('--bio-chart-text').trim() || '#1B2A37',
    split: style.getPropertyValue('--bio-chart-split').trim() || 'rgba(94,115,136,0.18)',
    teal: style.getPropertyValue('--bio-teal').trim() || '#0E7C86',
    accent: style.getPropertyValue('--bio-accent').trim() || '#1FA97A',
    sand: style.getPropertyValue('--bio-sand').trim() || '#D08B2C',
  }
}

const weekSeries = computed(() => {
  const map = Object.fromEntries((profile.value?.progress?.studyLog || []).map((item) => [item.date, item.minutes]))
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = formatDay(d)
    days.push({ date: key, label: key.slice(5), minutes: Number(map[key] || 0) })
  }
  return days
})

const learningRanking = computed(() => {
  const dayCount = rankingPeriod.value === 'today' ? 1 : rankingPeriod.value === 'threeDays' ? 3 : 7
  const dateKeys = new Set()
  const today = new Date()
  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    dateKeys.add(formatDay(date))
  }

  return students.value
    .map((student) => ({
      id: student.id,
      name: peerName(student.name),
      minutes: (student.progress?.studyLog || []).reduce(
        (total, log) => total + (dateKeys.has(log.date) ? Number(log.minutes || 0) : 0),
        0,
      ),
    }))
    .filter((student) => student.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name))
    .slice(0, 5)
})

const rankingOption = computed(() => {
  void theme.value
  const tone = chartTone()
  const list = [...learningRanking.value].reverse()
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = params?.[0]
        if (!item) return ''
        return `${item.name} · ${item.value} 分钟`
      },
    },
    grid: { left: 4, right: 30, top: 4, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      name: '分',
      axisLabel: { color: tone.axis, fontSize: 10 },
      splitLine: { lineStyle: { color: tone.split } },
    },
    yAxis: {
      type: 'category',
      data: list.map((item, index) => `${learningRanking.value.length - index}  ${item.name}`),
      axisLabel: { color: tone.label, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: list.map((item) => ({
          value: item.minutes,
          itemStyle: {
            color: item.id === profile.value?.id ? tone.sand : tone.teal,
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barWidth: 12,
        label: {
          show: true,
          position: 'right',
          color: tone.label,
          fontSize: 10,
          formatter: '{c}',
        },
      },
    ],
  }
})

const weekCurveOption = computed(() => {
  void theme.value
  const tone = chartTone()
  const series = weekSeries.value
  return {
    color: [tone.accent],
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params?.[0]
        if (!p) return ''
        return `${series[p.dataIndex]?.date || ''} · ${p.value} 分钟`
      },
    },
    grid: { left: 36, right: 12, top: 20, bottom: 28 },
    xAxis: {
      type: 'category',
      data: series.map((item) => item.label),
      axisLabel: { color: tone.axis },
      axisLine: { lineStyle: { color: tone.split } },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      axisLabel: { color: tone.axis },
      splitLine: { lineStyle: { color: tone.split } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: { color: 'rgba(31,169,122,0.14)' },
        lineStyle: { width: 2.5 },
        data: series.map((item) => item.minutes),
      },
    ],
  }
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const tasks = [
      fetchCases({ _sort: 'views', _order: 'desc' }),
      fetchCourses(),
      fetchUsers({ role: 'student' }),
    ]
    if (profile.value?.id) {
      tasks.push(fetchUser(profile.value.id).catch(() => null))
    }
    const [caseRes, courseRes, studentRes, latestUser] = await Promise.all(tasks)
    cases.value = caseRes.list
    courses.value = courseRes
    students.value = studentRes
    if (latestUser) {
      if (latestUser.progress) userStore.updateProgress(latestUser.progress)
      userStore.syncPoints(latestUser)
    }
  } catch (err) {
    error.value = err.userMessage || '首页数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDailyGoal()
  load()
  tryShowWelcome()
  if (isStudent.value) startHeroLineRotate()
})

onUnmounted(() => {
  if (heroLineTimer) {
    clearInterval(heroLineTimer)
    heroLineTimer = null
  }
})

watch(
  () => route.path,
  (path) => {
    if (path === '/') {
      load()
      tryShowWelcome()
      if (isStudent.value) startHeroLineRotate()
    }
  },
)

watch(() => profile.value?.id, loadDailyGoal)
</script>

<template>
  <div>
    <StateView :loading="loading" :error="error" @retry="load">
      <template #loading>
        <div class="grid gap-4 lg:grid-cols-3">
          <div v-for="n in 3" :key="n" class="bio-card p-5"><el-skeleton animated :rows="5" /></div>
        </div>
      </template>

      <section class="bio-card rise-in relative overflow-hidden p-6 md:p-8">
        <img :src="patternUrl" alt="" class="pointer-events-none absolute -right-6 top-4 h-28 w-32 opacity-70" />
        <div class="relative flex flex-col gap-6">
          <template v-if="isTeacher">
            <div class="max-w-2xl">
              <p class="text-sm text-accent">智能教学台 · 欢迎回来，{{ profile?.name }}</p>
              <h1 class="mt-2 text-2xl font-bold tracking-wide md:text-3xl">用智能学情驱动精准教学</h1>
              <p class="mt-3 text-sm leading-7 text-mist">
                智能教学台汇总班级高频提问、答题高频错题与薄弱知识点；可维护智能题库、智能组卷和案例资源，个人授课记录见「我的智慧档案」。
              </p>
            </div>
            <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
              <HeroMedia class-name="h-36 w-full rounded-2xl object-cover shadow-lift sm:h-auto sm:w-44" />
              <div class="grid min-w-[200px] flex-1 gap-3 text-sm text-mist">
                <div class="rounded-xl border border-[color:var(--bio-line)] bg-ink/50 px-4 py-3">
                  <p class="text-xs text-accent">本周教学焦点</p>
                  <p class="mt-1 text-paper">智能学情 + 薄弱知识点</p>
                </div>
                <div class="rounded-xl border border-[color:var(--bio-line)] bg-ink/40 px-4 py-3">
                  <p>案例智库 <span class="text-paper">{{ cases.length }}</span> 条</p>
                  <p class="mt-1">课程节点 <span class="text-paper">{{ courses.length }}</span> 个</p>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="isStudent">
            <AppleCarousel :covers="carouselCovers" />
            <div class="max-w-2xl">
              <h1 class="hero-line text-2xl font-bold tracking-wide md:text-3xl" :key="heroLineIndex">
                {{ heroLine }}
              </h1>
            </div>
            <div class="grid gap-4 lg:grid-cols-3">
              <div class="bio-card p-4">
                <p class="mb-3 text-xs text-mist">路径完成（实时刷新）</p>
                <div class="flex flex-wrap items-center justify-around gap-3">
                  <el-progress
                    type="circle"
                    :percentage="Math.round(progressPercent)"
                    :width="76"
                    :stroke-width="8"
                    color="var(--bio-teal)"
                  >
                    <template #default="{ percentage }">
                      <div class="text-center">
                        <p class="text-sm font-semibold">{{ percentage }}%</p>
                        <p class="text-[10px] text-mist">{{ completedIds.length }}/{{ courses.length }}</p>
                      </div>
                    </template>
                  </el-progress>
                  <div class="flex flex-col items-center gap-1">
                    <el-progress
                      type="circle"
                      :percentage="dailyGoalPercent"
                      :width="76"
                      :stroke-width="8"
                      color="var(--bio-accent)"
                    >
                      <template #default>
                        <div class="text-center leading-tight">
                          <p class="text-sm font-semibold">{{ todayStudyMinutes }}</p>
                          <p class="text-[10px] text-mist">分钟</p>
                        </div>
                      </template>
                    </el-progress>
                    <span class="text-[11px] text-mist">今日时长 / {{ dailyGoalMinutes }} 分</span>
                  </div>
                </div>
                <div class="mt-3 flex items-center justify-between gap-2 border-t border-[color:var(--bio-line)] pt-2">
                  <p class="text-[11px] text-mist">近 7 日累计 {{ studyMinutes }} 分钟</p>
                  <div class="flex items-center gap-1">
                    <span class="text-[11px] text-mist">今日目标</span>
                    <el-input-number
                      :model-value="dailyGoalMinutes"
                      :min="5"
                      :max="1440"
                      :step="5"
                      size="small"
                      controls-position="right"
                      class="daily-goal-input"
                      @change="saveDailyGoal"
                    />
                    <span class="text-[11px] text-mist">分</span>
                  </div>
                </div>
              </div>
              <div class="bio-card p-3">
                <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <p class="text-xs font-medium text-mist">学习进度排名</p>
                  <el-radio-group v-model="rankingPeriod" size="small">
                    <el-radio-button label="today">今日</el-radio-button>
                    <el-radio-button label="threeDays">近三日</el-radio-button>
                    <el-radio-button label="week">一周</el-radio-button>
                  </el-radio-group>
                </div>
                <StudyChart
                  v-if="learningRanking.length"
                  :option="rankingOption"
                  height="160px"
                />
                <div v-else class="flex h-40 items-center justify-center text-xs text-mist">
                  当前时间段暂无学习记录
                </div>
              </div>
              <div class="bio-card p-3 lg:col-span-1">
                <p class="mb-1 text-xs text-mist">近七日学习（拟合曲线）</p>
                <StudyChart :option="weekCurveOption" height="120px" />
              </div>
            </div>
          </template>
        </div>
      </section>

      <section class="mt-6">
        <h2 class="mb-3 text-lg font-semibold">{{ isTeacher ? '教学快捷入口' : '学习快捷入口' }}</h2>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 desktop:grid-cols-5">
          <router-link
            v-for="(item, index) in shortcuts"
            :key="`${item.to}-${item.label}`"
            :to="item.to"
            class="shortcut-card rise-in flex items-start gap-3 p-4"
            :style="{
              '--i': index,
              '--sc-bg': item.tone.bg,
              '--sc-border': item.tone.border,
              '--sc-shadow': item.tone.shadow,
            }"
          >
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              :style="{ background: item.tone.bg, boxShadow: `inset 0 0 0 1px ${item.tone.border}` }"
            >
              <SmartIcon :name="item.icon" :size="30" />
            </div>
            <div>
              <p class="font-semibold">{{ item.label }}</p>
              <p class="mt-1 text-sm text-mist">{{ item.desc }}</p>
            </div>
          </router-link>
        </div>
      </section>

      <section class="mt-8">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ isTeacher ? '重点案例预览' : '今日推荐案例' }}</h2>
          <router-link to="/cases" class="text-sm text-accent hover:underline">查看全部</router-link>
        </div>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CaseCard v-for="(item, index) in todayCases" :key="item.id" :item="item" :index="index" />
        </div>
      </section>
    </StateView>
  </div>
</template>
