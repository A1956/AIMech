<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchCases } from '@/api/case'
import { fetchCourses } from '@/api/course'
import { createRecord } from '@/api/record'
import { patchUser } from '@/api/user'
import PageHeader from '@/components/common/PageHeader.vue'
import StateView from '@/components/common/StateView.vue'
import TeacherPath from '@/components/business/TeacherPath.vue'
import { useAuth } from '@/composables/useAuth'
import { usePoints } from '@/composables/usePoints'
import { useRevealOnScroll } from '@/composables/useRevealOnScroll'
import { useUserStore } from '@/stores/user'
import { STAGE_ORDER } from '@/types'
import { PAGE_TITLES, PATH_SUBTITLE } from '@/types/labels'
import { POINTS_RULES } from '@/types/points'
import { formatDay } from '@/utils/format'

const { profile, isTeacher } = useAuth()
const userStore = useUserStore()
const { earn, points, claimedToday, claim, refreshPoints } = usePoints()

const loading = ref(true)
const error = ref('')
const courses = ref([])
const cases = ref([])
const expanded = ref({})
const savingId = ref(0)
const claiming = ref(false)
const arcVisible = ref(-1)
let arcTimer = null

const clearArcTimer = () => {
  if (arcTimer) {
    clearInterval(arcTimer)
    arcTimer = null
  }
}

const PATH_TONES = [
  { stroke: '#5EC8D0', fill: 'rgba(94,200,208,0.22)', border: '#5EC8D0' },
  { stroke: '#1FA97A', fill: 'rgba(31,169,122,0.28)', border: '#1FA97A' },
  { stroke: '#C45C26', fill: 'rgba(196,92,38,0.32)', border: '#C45C26' },
]

const GREY_TONE = {
  stroke: '#9CA3AF',
  fill: 'rgba(156,163,175,0.18)',
  border: '#9CA3AF',
  depth: 0.3,
}

const mixHex = (a, b, t) => {
  const parse = (hex) => {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

const toneAt = (t) => {
  if (t < 0.5) {
    const u = t / 0.5
    return {
      stroke: mixHex(PATH_TONES[0].stroke, PATH_TONES[1].stroke, u),
      fill: u < 0.5 ? PATH_TONES[0].fill : PATH_TONES[1].fill,
      border: mixHex(PATH_TONES[0].border, PATH_TONES[1].border, u),
      depth: 0.45 + t * 0.55,
    }
  }
  const u = (t - 0.5) / 0.5
  return {
    stroke: mixHex(PATH_TONES[1].stroke, PATH_TONES[2].stroke, u),
    fill: u < 0.5 ? PATH_TONES[1].fill : PATH_TONES[2].fill,
    border: mixHex(PATH_TONES[1].border, PATH_TONES[2].border, u),
    depth: 0.45 + t * 0.55,
  }
}

const caseMap = computed(() => Object.fromEntries(cases.value.map((item) => [item.id, item])))
const completedSet = computed(() => new Set(profile.value?.progress?.completedCourseIds || []))

const flatCourses = computed(() => [...courses.value].sort((a, b) => a.order - b.order))

const stages = computed(() =>
  STAGE_ORDER.map((stage) => ({
    stage,
    items: courses.value.filter((item) => item.stage === stage).sort((a, b) => a.order - b.order),
  })).filter((group) => group.items.length),
)

const progressText = computed(() => {
  const total = courses.value.length || 1
  const done = completedSet.value.size
  return `${done} / ${total}`
})

const ARC = { x0: 6, y0: 52, cx: 50, cy: 6, x1: 94, y1: 18 }

const pointOnArc = (t) => {
  const { x0, y0, cx, cy, x1, y1 } = ARC
  const u = 1 - t
  const x = u * u * x0 + 2 * u * t * cx + t * t * x1
  const y = u * u * y0 + 2 * u * t * cy + t * t * y1
  return { x, y }
}

const arcNodes = computed(() => {
  const list = flatCourses.value
  const n = list.length || 1
  return list.map((course, index) => {
    const t = n === 1 ? 0.5 : index / (n - 1)
    const { x, y } = pointOnArc(t)
    const done = completedSet.value.has(course.id)
    const tone = done ? toneAt(t) : GREY_TONE
    return { ...course, x, y, index, t, tone, done }
  })
})

const fullArcPath = computed(() => {
  const { x0, y0, cx, cy, x1, y1 } = ARC
  return `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`
})

const playArcReveal = async () => {
  clearArcTimer()
  arcVisible.value = -1
  await nextTick()
  const total = flatCourses.value.length
  if (!total) return
  let i = 0
  arcVisible.value = 0
  arcTimer = setInterval(() => {
    i += 1
    if (i >= total) {
      clearArcTimer()
      return
    }
    arcVisible.value = i
  }, 220)
}

const onClaim = async () => {
  if (claiming.value || claimedToday.value) return
  claiming.value = true
  try {
    await claim()
  } finally {
    claiming.value = false
  }
}

const load = async () => {
  loading.value = true
  error.value = ''
  clearArcTimer()
  arcVisible.value = -1
  try {
    const [courseRes, caseRes] = await Promise.all([fetchCourses(), fetchCases()])
    courses.value = courseRes
    cases.value = caseRes.list
    expanded.value = Object.fromEntries(courseRes.map((item) => [item.id, item.order <= 2]))
  } catch (err) {
    error.value = err.userMessage || '智能学习路径加载失败'
  } finally {
    loading.value = false
    if (!error.value && courses.value.length) playArcReveal()
  }
}

const toggleExpand = (id) => {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}

const toggleComplete = async (course, checked) => {
  if (!profile.value || savingId.value) return
  savingId.value = course.id
  try {
    const current = [...(profile.value.progress?.completedCourseIds || [])]
    const nextIds = checked
      ? [...new Set([...current, course.id])]
      : current.filter((id) => id !== course.id)
    const studyLog = [...(profile.value.progress?.studyLog || [])]
    if (checked) {
      const today = formatDay(new Date())
      const found = studyLog.find((item) => item.date === today)
      if (found) found.minutes += course.duration
      else studyLog.push({ date: today, minutes: course.duration })
      await Promise.all(
        (course.caseIds || []).map((caseId) =>
          createRecord({
            userId: profile.value.id,
            caseId,
            type: 'complete',
            createdAt: new Date().toISOString(),
          }),
        ),
      )
    }
    const progress = { completedCourseIds: nextIds, studyLog }
    const updated = await patchUser(profile.value.id, { progress })
    userStore.updateProgress(updated.progress || progress)
    if (checked && !current.includes(course.id)) {
      await earn({ amount: POINTS_RULES.pathComplete, reason: `完成路径节点：${course.title}` })
      ElMessage.success(`已标记完成 · 学时已写入 · +${POINTS_RULES.pathComplete} 积分`)
    } else {
      ElMessage.success(checked ? '已标记完成并写入学时' : '已取消完成状态')
    }
  } catch (err) {
    ElMessage.error(err.userMessage || '进度保存失败')
  } finally {
    savingId.value = 0
  }
}

const cognitionItems = computed(() => stages.value.find((g) => g.stage === '机理认知')?.items || [])
const otherStages = computed(() => stages.value.filter((g) => g.stage !== '机理认知'))
const { isVisible: isCogVisible, setRevealRef: setCogRevealRef, reset: resetCogReveal } = useRevealOnScroll(
  cognitionItems,
  { rootMargin: '0px 0px -12% 0px', threshold: 0.2 },
)

watch(cognitionItems, () => resetCogReveal())

onMounted(async () => {
  if (isTeacher.value) return
  await load()
  await refreshPoints()
})

onUnmounted(clearArcTimer)
</script>

<template>
  <TeacherPath v-if="isTeacher" />

  <div v-else>
    <PageHeader
      :title="PAGE_TITLES.path"
      :subtitle="`${PATH_SUBTITLE} 当前进度 ${progressText}`"
    />

    <section class="bio-card mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p class="text-xs text-mist">学习路径 · 每日积分</p>
        <p class="mt-1 text-sm">
          当前余额
          <span class="font-semibold text-sand">{{ points }}</span>
          <span class="text-mist"> · 每日可领 +{{ POINTS_RULES.dailyClaim }}</span>
        </p>
      </div>
      <el-button
        :type="claimedToday ? 'info' : 'warning'"
        :plain="claimedToday"
        :disabled="claimedToday"
        :loading="claiming"
        @click="onClaim"
      >
        {{ claimedToday ? '今日已领' : '领取今日积分' }}
      </el-button>
    </section>

    <StateView :loading="loading" :error="error" :empty="!courses.length" empty-title="暂无课程节点" @retry="load">
      <template #loading>
        <div class="space-y-4">
          <div v-for="n in 3" :key="n" class="bio-card p-5"><el-skeleton animated :rows="3" /></div>
        </div>
      </template>

      <section class="bio-card mb-6 overflow-x-auto p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h2 class="text-base font-semibold">上升圆弧学习路径</h2>
          <el-button text size="small" type="primary" @click="playArcReveal">重播动画</el-button>
        </div>
        <div class="path-stair relative mx-auto h-56 min-w-[640px] max-w-5xl">
          <svg class="path-stair-svg" viewBox="0 0 100 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pathRiseGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#5EC8D0" stop-opacity="0.55" />
                <stop offset="50%" stop-color="#1FA97A" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#C45C26" stop-opacity="1" />
              </linearGradient>
              <linearGradient id="pathRiseGlow" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#8EDDE3" stop-opacity="0.35" />
                <stop offset="55%" stop-color="#3BC48A" stop-opacity="0.55" />
                <stop offset="100%" stop-color="#E07A3A" stop-opacity="0.75" />
              </linearGradient>
            </defs>
            <path
              :d="fullArcPath"
              fill="none"
              stroke="url(#pathRiseGlow)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-opacity="0.22"
              vector-effect="non-scaling-stroke"
            />
            <path
              :d="fullArcPath"
              class="path-arc-draw"
              fill="none"
              stroke="url(#pathRiseGrad)"
              stroke-width="1.45"
              stroke-linecap="round"
              vector-effect="non-scaling-stroke"
              :style="{ opacity: arcVisible >= 0 ? 1 : 0 }"
            />
          </svg>
          <button
            v-for="node in arcNodes"
            :key="node.id"
            type="button"
            class="path-stair-node absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            :class="{
              'is-on': node.index <= arcVisible,
              'is-pending': !node.done,
            }"
            :style="{ left: `${node.x}%`, top: `${(node.y / 60) * 100}%` }"
            @click="toggleExpand(node.id)"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold shadow-sm"
              :style="{
                borderColor: node.tone.border,
                background: node.done ? node.tone.border : 'var(--bio-panel, #fff)',
                color: node.done ? '#fff' : node.tone.border,
                boxShadow: node.done ? `0 0 ${6 + node.tone.depth * 10}px ${node.tone.fill}` : 'none',
                opacity: node.done ? 1 : 0.72,
              }"
            >
              {{ node.order }}
            </span>
            <span
              class="mt-1 max-w-[88px] truncate text-[11px]"
              :class="node.done ? 'text-mist' : 'text-mist/70'"
            >
              {{ node.title }}
            </span>
          </button>
        </div>
        <p class="mt-2 text-center text-xs text-mist">灰色节点尚未完成 · 完成项沿弧显示强调色</p>
      </section>

      <section v-if="cognitionItems.length" class="mb-8">
        <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
          <span class="h-2 w-2 rounded-full bg-accent" />
          机理认知
        </h2>
        <div class="relative space-y-3 border-l border-teal/30 pl-5">
          <article
            v-for="course in cognitionItems"
            :key="course.id"
            class="bio-card path-cog-card relative p-4"
            :class="{
              'is-on': isCogVisible(course.id),
              'is-pending': !completedSet.has(course.id),
            }"
            :data-reveal-id="course.id"
            :ref="setCogRevealRef(course.id)"
          >
            <span
              class="absolute -left-[1.65rem] top-5 h-3 w-3 rounded-full border-2"
              :class="completedSet.has(course.id) ? 'border-accent bg-accent' : 'border-mist bg-panel'"
            />
            <div class="flex flex-wrap items-start justify-between gap-3">
              <button type="button" class="min-w-0 flex-1 text-left" @click="toggleExpand(course.id)">
                <p class="text-xs text-mist">节点 {{ course.order }} · 约 {{ course.duration }} 分钟</p>
                <h3
                  class="mt-1 text-base font-semibold"
                  :class="completedSet.has(course.id) ? 'text-paper' : 'text-mist'"
                >
                  {{ course.title }}
                </h3>
                <p class="mt-1 text-sm" :class="completedSet.has(course.id) ? 'text-mist' : 'text-mist/80'">
                  {{ course.desc }}
                </p>
              </button>
              <el-checkbox
                :model-value="completedSet.has(course.id)"
                :disabled="savingId === course.id"
                @change="(val) => toggleComplete(course, val)"
              >
                已完成
              </el-checkbox>
            </div>
            <div v-if="expanded[course.id]" class="mt-4 rounded-xl bg-ink/50 p-3">
              <p class="mb-2 text-xs text-accent">关联案例</p>
              <div class="flex flex-wrap gap-2">
                <router-link
                  v-for="caseId in course.caseIds"
                  :key="caseId"
                  :to="`/cases/${caseId}`"
                  class="rounded-lg border border-[color:var(--bio-line)] px-3 py-1.5 text-sm text-paper hover:border-teal/60"
                >
                  {{ caseMap[caseId]?.title || `案例 #${caseId}` }}
                </router-link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div class="space-y-8">
        <section
          v-for="(group, gIndex) in otherStages"
          :key="group.stage"
          class="path-stage-block"
          :class="{ 'is-on': arcVisible >= 0 }"
          :style="{ '--stage-i': gIndex }"
        >
          <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
            <span class="h-2 w-2 rounded-full bg-accent" />
            {{ group.stage }}
          </h2>
          <div class="relative space-y-3 border-l border-teal/30 pl-5">
            <article
              v-for="course in group.items"
              :key="course.id"
              class="bio-card path-stair-card relative p-4"
              :class="{
                'is-on': course.order - 1 <= arcVisible,
                'is-pending': !completedSet.has(course.id),
              }"
              :style="{ '--i': course.order - 1 }"
            >
              <span
                class="absolute -left-[1.65rem] top-5 h-3 w-3 rounded-full border-2"
                :class="completedSet.has(course.id) ? 'border-accent bg-accent' : 'border-mist bg-panel'"
              />
              <div class="flex flex-wrap items-start justify-between gap-3">
                <button type="button" class="min-w-0 flex-1 text-left" @click="toggleExpand(course.id)">
                  <p class="text-xs text-mist">节点 {{ course.order }} · 约 {{ course.duration }} 分钟</p>
                  <h3
                    class="mt-1 text-base font-semibold"
                    :class="completedSet.has(course.id) ? 'text-paper' : 'text-mist'"
                  >
                    {{ course.title }}
                  </h3>
                  <p class="mt-1 text-sm text-mist">{{ course.desc }}</p>
                </button>
                <el-checkbox
                  :model-value="completedSet.has(course.id)"
                  :disabled="savingId === course.id"
                  @change="(val) => toggleComplete(course, val)"
                >
                  已完成
                </el-checkbox>
              </div>

              <div v-if="expanded[course.id]" class="mt-4 rounded-xl bg-ink/50 p-3">
                <p class="mb-2 text-xs text-accent">关联案例</p>
                <div class="flex flex-wrap gap-2">
                  <router-link
                    v-for="caseId in course.caseIds"
                    :key="caseId"
                    :to="`/cases/${caseId}`"
                    class="rounded-lg border border-[color:var(--bio-line)] px-3 py-1.5 text-sm text-paper hover:border-teal/60"
                  >
                    {{ caseMap[caseId]?.title || `案例 #${caseId}` }}
                  </router-link>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </StateView>
  </div>
</template>
