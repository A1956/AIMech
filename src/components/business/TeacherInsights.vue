<script setup>
import { computed } from 'vue'
import StudyChart from '@/components/business/StudyChart.vue'
import { useTheme } from '@/composables/useTheme'
import {
  buildQuestionBarOption,
  buildVideoBarOption,
  buildWeakPieOption,
  buildWrongBarOption,
} from '@/utils/teacherAnalytics'
import { formatDate } from '@/utils/format'

const props = defineProps({
  hotQuestions: { type: Array, default: () => [] },
  hotWrongQuestions: { type: Array, default: () => [] },
  hotVideos: { type: Array, default: () => [] },
  weakPoints: { type: Array, default: () => [] },
  studentCount: { type: Number, default: 0 },
  teachingDuration: {
    type: Object,
    default: () => ({ courseMinutes: 0, videoMinutes: 0, totalMinutes: 0, courseHours: 0, videoHours: 0 }),
  },
})

const { theme } = useTheme()

const questionOption = computed(() => {
  void theme.value
  return buildQuestionBarOption(props.hotQuestions.slice(0, 6))
})
const wrongOption = computed(() => {
  void theme.value
  return buildWrongBarOption(props.hotWrongQuestions.slice(0, 6))
})
const videoOption = computed(() => {
  void theme.value
  return buildVideoBarOption(props.hotVideos.slice(0, 6))
})
const weakOption = computed(() => {
  void theme.value
  return buildWeakPieOption(props.weakPoints.slice(0, 5))
})

const summary = computed(() => [
  { label: '在学学生', value: props.studentCount },
  { label: '班级高频提问', value: props.hotQuestions.length },
  { label: '高频错题', value: props.hotWrongQuestions.length },
  {
    label: '教学时长合计',
    value: `${props.teachingDuration.totalMinutes || 0} 分`,
    tip: `路径 ${props.teachingDuration.courseHours || 0}h · 视频 ${props.teachingDuration.videoHours || 0}h`,
  },
])
</script>

<template>
  <div class="space-y-6">
    <section class="bio-card p-4">
      <div class="mb-2">
        <h3 class="text-base font-semibold">学生高频问题</h3>
        <p class="text-xs text-mist">置顶展示：来自助教会话与班级提问统计，便于优先安排答疑课</p>
      </div>
      <StudyChart :option="questionOption" height="280px" />
      <div class="mt-3 grid gap-2 md:grid-cols-2">
        <div
          v-for="(item, index) in hotQuestions.slice(0, 5)"
          :key="`${item.question}-${index}`"
          class="rounded-xl border border-white/5 bg-ink/35 px-3 py-2"
        >
          <p class="text-sm text-paper">{{ index + 1 }}. {{ item.question }}</p>
          <p class="mt-1 text-xs text-mist">
            {{ item.topic }} · 提问 {{ item.count }} 次 · {{ formatDate(item.lastAskedAt) }}
          </p>
        </div>
      </div>
    </section>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="item in summary" :key="item.label" class="bio-card p-4">
        <p class="text-xs text-mist">{{ item.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-paper">{{ item.value }}</p>
        <p v-if="item.tip" class="mt-1 text-xs text-mist">{{ item.tip }}</p>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <article class="bio-card p-4 xl:col-span-2">
        <div class="mb-2">
          <h3 class="text-base font-semibold">答题高频错题</h3>
          <p class="text-xs text-mist">来自学生自测与课堂检测卷，建议下周复测</p>
        </div>
        <StudyChart :option="wrongOption" height="280px" />
        <div class="mt-3 overflow-x-auto">
          <el-table :data="hotWrongQuestions.slice(0, 6)" size="small" style="min-width: 520px">
            <el-table-column prop="stem" label="题干" min-width="220" show-overflow-tooltip />
            <el-table-column prop="subject" label="科目" width="90" />
            <el-table-column prop="knowledgePoint" label="知识点" min-width="120" />
            <el-table-column prop="wrongCount" label="错次" width="70" />
          </el-table>
        </div>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <article class="bio-card p-4">
        <div class="mb-2">
          <h3 class="text-base font-semibold">教学统计</h3>
          <p class="text-xs text-mist">按累计观看量从低到高展示，便于识别需要补充教学的内容</p>
        </div>
        <StudyChart :option="videoOption" height="280px" />
        <div class="mt-3 overflow-x-auto">
          <el-table :data="hotVideos.slice(0, 6)" size="small" style="min-width: 520px">
            <el-table-column prop="title" label="视频" min-width="220" />
            <el-table-column prop="knowledgePoint" label="知识点" min-width="120" />
            <el-table-column prop="views" label="观看" width="80" />
            <el-table-column prop="durationMin" label="片长(分)" width="90" />
          </el-table>
        </div>
      </article>

      <article class="bio-card p-4">
        <h3 class="mb-1 text-base font-semibold">知识点薄弱分布</h3>
        <p class="mb-2 text-xs text-mist">综合标注薄弱率与路径完成率，优先补课</p>
        <StudyChart :option="weakOption" height="300px" />
      </article>
    </section>

    <section class="bio-card overflow-hidden p-4">
      <h3 class="mb-3 text-base font-semibold">薄弱项与教学建议</h3>
      <div class="overflow-x-auto">
        <el-table :data="weakPoints" style="min-width: 640px">
          <el-table-column prop="knowledgePoint" label="知识点" min-width="150" />
          <el-table-column prop="stage" label="阶段" width="100" />
          <el-table-column label="完成率" width="90">
            <template #default="{ row }">
              {{ Math.round((row.completionRate || 0) * 100) }}%
            </template>
          </el-table-column>
          <el-table-column label="薄弱率" width="90">
            <template #default="{ row }">
              {{ Math.round((row.weakRate || 0) * 100) }}%
            </template>
          </el-table-column>
          <el-table-column prop="wrongHint" label="常见误区" min-width="180" />
          <el-table-column prop="suggestion" label="建议教学动作" min-width="180" />
        </el-table>
      </div>
    </section>
  </div>
</template>
