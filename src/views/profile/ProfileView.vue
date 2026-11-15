<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import { fetchCases } from '@/api/case'
import { fetchFavorites } from '@/api/favorite'
import { fetchQuizAttempts } from '@/api/quiz'
import { fetchRecords } from '@/api/record'
import { fetchTeachingRecords, fetchTutoringRecords } from '@/api/teacher'
import { patchUser } from '@/api/user'
import AnimatedNumber from '@/components/business/AnimatedNumber.vue'
import CaseCard from '@/components/business/CaseCard.vue'
import StudyChart from '@/components/business/StudyChart.vue'
import TeacherArchive from '@/components/business/TeacherArchive.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StateView from '@/components/common/StateView.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { useAuth } from '@/composables/useAuth'
import { usePoints } from '@/composables/usePoints'
import { useTheme } from '@/composables/useTheme'
import { useFavoriteStore } from '@/stores/favorite'
import { useUserStore } from '@/stores/user'
import { DAILY_LEARNING_DRAW_PRIZES, INVENTORY_LABELS, POINTS_RULES } from '@/types/points'
import { compressAvatarImage, STUDENT_DEFAULT_AVATAR } from '@/utils/avatar'
import { formatDate, peerName, sumMinutes } from '@/utils/format'

const { profile, isTeacher } = useAuth()
const { theme } = useTheme()
const favoriteStore = useFavoriteStore()
const userStore = useUserStore()
const {
  points,
  chatQuota,
  unlockedCaseIds,
  inventory,
  freeLeftToday,
  drewLearningItemToday,
  drawLearningItem,
  refreshPoints,
} = usePoints()

const inventorySummary = computed(() => {
  const counts = inventory.value.reduce((result, item) => {
    result[item] = (result[item] || 0) + 1
    return result
  }, {})
  return Object.entries(counts).map(([item, count]) => ({
    item,
    label: INVENTORY_LABELS[item] || item,
    count,
  }))
})
const drawOddsText = computed(() =>
  DAILY_LEARNING_DRAW_PRIZES.map((prize) => `${prize.label} ${prize.probability}%`).join(' · '),
)
const drawing = ref(false)
const avatarDialog = ref(false)
const selectedAvatar = ref('')
const avatarSaving = ref(false)
const avatarProcessing = ref(false)
const avatarInput = ref(null)
const avatarBusy = computed(() => avatarSaving.value || avatarProcessing.value)

const openAvatarDialog = () => {
  selectedAvatar.value =
    profile.value?.avatar || (isTeacher.value ? 'initials' : STUDENT_DEFAULT_AVATAR)
  avatarDialog.value = true
}

const persistAvatar = async (avatar) => {
  if (!profile.value?.id) {
    ElMessage.error('登录状态已失效，请重新登录')
    return
  }
  avatarSaving.value = true
  try {
    const updatedUser = await patchUser(profile.value.id, { avatar })
    userStore.setProfile(updatedUser)
    avatarDialog.value = false
    ElMessage.success('头像已更新')
  } catch (err) {
    ElMessage.error(err.userMessage || err.message || '保存头像失败')
  } finally {
    avatarSaving.value = false
  }
}

const saveSelectedAvatar = () => persistAvatar(selectedAvatar.value)

const chooseAvatarFile = () => avatarInput.value?.click()

const onAvatarFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  avatarProcessing.value = true
  try {
    const avatar = await compressAvatarImage(file)
    await persistAvatar(avatar)
  } catch (err) {
    ElMessage.error(err.userMessage || err.message || '处理头像失败')
  } finally {
    avatarProcessing.value = false
    event.target.value = ''
  }
}

const onDrawLearningItem = async () => {
  if (drawing.value || drewLearningItemToday.value) return
  drawing.value = true
  try {
    await drawLearningItem()
  } finally {
    drawing.value = false
  }
}

const loading = ref(true)
const error = ref('')
const cases = ref([])
const records = ref([])
const attempts = ref([])
const teachingRecords = ref([])
const tutoringRecords = ref([])

const caseMap = computed(() => Object.fromEntries(cases.value.map((item) => [item.id, item])))
const favoriteCases = computed(() =>
  favoriteStore.items
    .map((item) => caseMap.value[item.caseId])
    .filter(Boolean),
)
const recentRecords = computed(() => records.value.slice(0, 8))
const totalMinutes = computed(() => sumMinutes(profile.value?.progress?.studyLog || []))

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

const lineOption = computed(() => {
  void theme.value
  const tone = chartTone()
  const log = [...(profile.value?.progress?.studyLog || [])].sort((a, b) => a.date.localeCompare(b.date))
  return {
    animationDuration: 2600,
    animationDurationUpdate: 1200,
    animationEasing: 'cubicOut',
    color: [tone.accent],
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 24, bottom: 28 },
    xAxis: {
      type: 'category',
      data: log.map((item) => item.date.slice(5)),
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
        areaStyle: { color: 'rgba(31,169,122,0.12)' },
        data: log.map((item) => item.minutes),
      },
    ],
  }
})

const pieOption = computed(() => {
  void theme.value
  const tone = chartTone()
  const completed = records.value.filter((item) => item.type === 'complete')
  const counter = {}
  completed.forEach((item) => {
    const difficulty = caseMap.value[item.caseId]?.difficulty || '其他'
    counter[difficulty] = (counter[difficulty] || 0) + 1
  })
  const data = Object.entries(counter).map(([name, value]) => ({ name, value }))
  return {
    color: [tone.accent, tone.teal, tone.sand, tone.mist],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: tone.axis } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        data: data.length ? data : [{ name: '暂无完成', value: 1 }],
        label: { color: tone.label },
      },
    ],
  }
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const userId = profile.value.id
    const student = !isTeacher.value
    const [caseRes, favorites, recordRes, attemptRes, teachingRes, tutoringRes] = await Promise.all([
      fetchCases(),
      fetchFavorites(userId),
      student ? fetchRecords({ userId }) : Promise.resolve([]),
      student
        ? fetchQuizAttempts({ userId, _limit: 6 }, { silent: true }).catch(() => [])
        : Promise.resolve([]),
      isTeacher.value ? fetchTeachingRecords() : Promise.resolve([]),
      isTeacher.value ? fetchTutoringRecords() : Promise.resolve([]),
      student ? refreshPoints() : Promise.resolve(null),
    ])
    cases.value = caseRes.list
    favoriteStore.hydrate(favorites)
    records.value = recordRes
    attempts.value = attemptRes
    teachingRecords.value = teachingRes
    tutoringRecords.value = tutoringRes
  } catch (err) {
    error.value = err.userMessage || '个人中心加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader
      title="我的智慧档案"
      :subtitle="
        isTeacher
          ? '查看教学时长、近期授课与辅导记录。班级学情请到「智能教学台」。'
          : '收藏、学习记录、答题智测成绩与个人看板，刷新后登录态与收藏仍会保留。'
      "
    />

    <StateView :loading="loading" :error="error" @retry="load">
      <template #loading>
        <div class="grid gap-4 lg:grid-cols-2">
          <div v-for="n in 4" :key="n" class="bio-card p-5"><el-skeleton animated :rows="4" /></div>
        </div>
      </template>

      <section class="bio-card mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div class="flex flex-wrap items-center gap-4">
          <UserAvatar
            :avatar="profile?.avatar"
            :name="profile?.name"
            :student="!isTeacher"
            :size="56"
          />
          <div>
            <h2 class="text-lg font-semibold">{{ isTeacher ? profile?.name : peerName(profile?.name) }}</h2>
            <p class="text-sm text-mist">
              {{ isTeacher ? '教师端' : '学生端' }} · @{{ profile?.username }}
              <template v-if="!isTeacher">
                · 累计学习 <AnimatedNumber :value="totalMinutes" /> 分钟
              </template>
            </p>
          </div>
          <el-button :icon="Camera" plain @click="openAvatarDialog">设置头像</el-button>
        </div>
        <router-link v-if="isTeacher" to="/admin?tab=insights" class="text-sm text-accent hover:underline">
          打开智能学情 →
        </router-link>
        <router-link v-else to="/rewards" class="text-sm text-accent hover:underline">
          去积分商城 →
        </router-link>
      </section>

      <TeacherArchive
        v-if="isTeacher"
        class="mb-6"
        :teacher="profile"
        :teaching-records="teachingRecords"
        :tutoring-records="tutoringRecords"
      />

      <section v-if="!isTeacher" class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="bio-card p-4">
          <p class="text-xs text-mist">积分余额</p>
          <p class="mt-1 text-xl font-semibold text-sand"><AnimatedNumber :value="points" /></p>
        </div>
        <div class="bio-card p-4">
          <p class="text-xs text-mist">问答余量</p>
          <p class="mt-1 text-xl font-semibold"><AnimatedNumber :value="chatQuota" /></p>
          <p class="mt-1 text-xs text-mist">今日免费 {{ freeLeftToday }}/{{ POINTS_RULES.dailyFreeChat }}</p>
        </div>
        <div class="bio-card p-4">
          <p class="text-xs text-mist">已解锁案例</p>
          <p class="mt-1 text-xl font-semibold"><AnimatedNumber :value="unlockedCaseIds.length" /></p>
        </div>
        <div class="bio-card p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-mist">学习道具</p>
            <el-button
              size="small"
              type="primary"
              class="btn-accent"
              :loading="drawing"
              :disabled="drewLearningItemToday"
              @click="onDrawLearningItem"
            >
              {{ drewLearningItemToday ? '明日再来' : '每日抽一次' }}
            </el-button>
          </div>
          <p v-if="inventorySummary.length" class="mt-2 text-sm leading-6">
            <span v-for="(item, index) in inventorySummary" :key="item.item">
              <span v-if="index"> · </span>{{ item.label }} × {{ item.count }}
            </span>
          </p>
          <p v-else class="mt-2 text-sm text-mist">暂无道具</p>
          <p class="mt-2 text-xs leading-5 text-mist">
            每日一次 · {{ drawOddsText }}
          </p>
        </div>
      </section>

      <div v-if="!isTeacher" class="grid gap-5 lg:grid-cols-2">
        <section class="bio-card p-5">
          <h3 class="mb-3 font-semibold">学习时长趋势</h3>
          <StudyChart :option="lineOption" height="240px" />
        </section>
        <section class="bio-card p-5">
          <h3 class="mb-3 font-semibold">案例完成分布</h3>
          <StudyChart type="pie" :option="pieOption" height="240px" />
        </section>
      </div>

      <section class="mt-6">
        <h3 class="mb-3 text-lg font-semibold">
          我的收藏（<AnimatedNumber :value="favoriteCases.length" />）
        </h3>
        <StateView
          :loading="false"
          :empty="!favoriteCases.length"
          empty-title="还没有收藏"
          empty-text="在案例详情页点收藏，会出现在这里。"
        >
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CaseCard v-for="(item, index) in favoriteCases" :key="item.id" :item="item" :index="index" />
          </div>
        </StateView>
      </section>

      <section v-if="!isTeacher" class="mt-6 bio-card p-5">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="font-semibold">最近自测成绩</h3>
          <router-link to="/quiz" class="text-sm text-accent hover:underline">去答题 →</router-link>
        </div>
        <StateView
          :loading="false"
          :empty="!attempts.length"
          empty-title="还没有自测记录"
          empty-text="完成一组答题后会出现在这里。"
        >
          <ul class="space-y-3">
            <li
              v-for="item in attempts.slice(0, 6)"
              :key="item.id"
              class="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3 text-sm last:border-0"
            >
              <div>
                <p class="font-medium">{{ item.subject }} · {{ item.score }}/{{ item.total }}</p>
                <p class="text-xs text-mist">
                  {{ item.mode === 'assigned' ? '课堂检测' : '自由自测' }}
                  · 错题 {{ item.wrongQuestionIds?.length || 0 }} 道
                </p>
              </div>
              <span class="text-xs text-mist">{{ formatDate(item.createdAt) }}</span>
            </li>
          </ul>
        </StateView>
      </section>

      <section v-if="!isTeacher" class="mt-6 bio-card p-5">
        <h3 class="mb-3 font-semibold">最近学习记录</h3>
        <StateView
          :loading="false"
          :empty="!recentRecords.length"
          empty-title="暂无学习记录"
          empty-text="浏览或完成案例后会出现在这里。"
        >
          <ul class="space-y-3">
            <li
              v-for="item in recentRecords"
              :key="item.id"
              class="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3 text-sm last:border-0"
            >
              <div>
                <router-link :to="`/cases/${item.caseId}`" class="font-medium text-paper hover:text-accent">
                  {{ caseMap[item.caseId]?.title || `案例 #${item.caseId}` }}
                </router-link>
                <p class="text-xs text-mist">{{ item.type === 'complete' ? '完成学习' : '浏览案例' }}</p>
              </div>
              <span class="text-xs text-mist">{{ formatDate(item.createdAt) }}</span>
            </li>
          </ul>
        </StateView>
      </section>
    </StateView>

    <el-dialog
      v-model="avatarDialog"
      title="设置头像"
      width="min(420px, 92vw)"
      :close-on-click-modal="!avatarBusy"
      :close-on-press-escape="!avatarBusy"
      :show-close="!avatarBusy"
    >
      <p class="mb-4 text-sm text-mist">选择默认头像风格，或上传一张自己的图片。</p>
      <div class="grid grid-cols-2 gap-3" role="radiogroup" aria-label="默认头像">
        <button
          v-for="choice in [
            { value: STUDENT_DEFAULT_AVATAR, label: '默认人像' },
            { value: 'initials', label: '姓氏汉字' },
          ]"
          :key="choice.value"
          type="button"
          role="radio"
          :aria-checked="selectedAvatar === choice.value"
          class="flex flex-col items-center gap-2 rounded-xl border p-4 transition"
          :class="
            selectedAvatar === choice.value
              ? 'border-teal bg-teal/10'
              : 'border-white/10 hover:border-teal/50'
          "
          :disabled="avatarBusy"
          @click="selectedAvatar = choice.value"
        >
          <UserAvatar :avatar="choice.value" :name="profile?.name" :size="64" />
          <span class="text-sm font-medium">{{ choice.label }}</span>
        </button>
      </div>
      <input
        ref="avatarInput"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        @change="onAvatarFileChange"
      >
      <p class="mt-4 text-xs leading-5 text-mist">支持 PNG、JPEG、WebP；原图不超过 5MB，头像最长边缩放至 256px 并压缩到 200KB 内。</p>
      <template #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <el-button :disabled="avatarBusy" @click="chooseAvatarFile">上传图片</el-button>
          <el-button :disabled="avatarBusy" @click="avatarDialog = false">取消</el-button>
          <el-button type="primary" :loading="avatarSaving" :disabled="avatarBusy" @click="saveSelectedAvatar">
            保存头像
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
