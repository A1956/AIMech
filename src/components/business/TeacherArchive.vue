<script setup>
import { computed } from 'vue'
import { formatDate } from '@/utils/format'

const props = defineProps({
  teacher: { type: Object, default: () => ({}) },
  teachingRecords: { type: Array, default: () => [] },
  tutoringRecords: { type: Array, default: () => [] },
})

const totalMinutes = computed(() =>
  props.teachingRecords.reduce((sum, record) => sum + Number(record.durationMin || 0), 0),
)
const totalHours = computed(() => (totalMinutes.value / 60).toFixed(1))
</script>

<template>
  <div class="space-y-5">
    <section class="bio-card flex flex-wrap items-center justify-between gap-4 p-5">
      <div class="flex items-center gap-4">
        <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/15 text-xl font-semibold text-teal">
          {{ teacher.name?.slice(0, 1) || '师' }}
        </span>
        <div>
          <p class="text-xs font-semibold tracking-[0.18em] text-teal">TEACHER PROFILE</p>
          <h2 class="mt-1 text-xl font-semibold">{{ teacher.name || '教师' }} · 我的智慧档案</h2>
          <p class="mt-1 text-sm text-mist">仿生机械设计 · 智能教学与个性化辅导</p>
        </div>
      </div>
      <div class="min-w-40 rounded-xl border border-teal/20 bg-teal/10 px-5 py-3">
        <p class="text-xs text-mist">教学记录时长</p>
        <p class="mt-1 text-2xl font-semibold text-teal">{{ totalHours }} <span class="text-sm">小时</span></p>
        <p class="mt-1 text-xs text-mist">{{ teachingRecords.length }} 条近期教学记录</p>
      </div>
    </section>

    <section class="bio-card overflow-hidden p-4">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold">最近教学记录</h3>
          <p class="mt-1 text-xs text-mist">按授课时间倒序，查看课程、方法和课堂反馈。</p>
        </div>
      </div>
      <el-table :data="teachingRecords" style="min-width: 760px">
        <el-table-column label="时间" min-width="150">
          <template #default="{ row }">{{ formatDate(row.date) }}</template>
        </el-table-column>
        <el-table-column prop="title" label="教学主题" min-width="190" />
        <el-table-column prop="method" label="教学方法" min-width="160" />
        <el-table-column prop="attendees" label="参与人数" width="100" />
        <el-table-column label="时长" width="90">
          <template #default="{ row }">{{ row.durationMin }} 分钟</template>
        </el-table-column>
        <el-table-column prop="summary" label="课堂记录" min-width="220" show-overflow-tooltip />
      </el-table>
    </section>

    <section class="bio-card overflow-hidden p-4">
      <div class="mb-3">
        <h3 class="text-base font-semibold">近期辅导记录</h3>
        <p class="mt-1 text-xs text-mist">追踪个别辅导的问题、干预方式与后续安排。</p>
      </div>
      <el-table :data="tutoringRecords" style="min-width: 760px">
        <el-table-column label="时间" min-width="150">
          <template #default="{ row }">{{ formatDate(row.date) }}</template>
        </el-table-column>
        <el-table-column prop="studentName" label="学生" width="120" />
        <el-table-column prop="topic" label="辅导主题" min-width="180" />
        <el-table-column prop="method" label="辅导方式" min-width="140" />
        <el-table-column label="时长" width="90">
          <template #default="{ row }">{{ row.durationMin }} 分钟</template>
        </el-table-column>
        <el-table-column prop="result" label="辅导进展" min-width="200" show-overflow-tooltip />
        <el-table-column prop="followUp" label="后续计划" min-width="180" show-overflow-tooltip />
      </el-table>
    </section>
  </div>
</template>
