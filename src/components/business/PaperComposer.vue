<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createPaper, fetchPapers, removePaper } from '@/api/paper'
import { fetchQuestions } from '@/api/question'
import StateView from '@/components/common/StateView.vue'
import { useAuth } from '@/composables/useAuth'
import { usePermission } from '@/composables/usePermission'
import { DIFFICULTIES, QUESTION_TYPES, QUIZ_SUBJECTS } from '@/types'
import { composePaperQuestions } from '@/utils/quizEngine'
import { formatDate } from '@/utils/format'

const emit = defineEmits(['changed'])
const { profile } = useAuth()
const { assertTeacher, canComposePaper } = usePermission()

const loading = ref(true)
const error = ref('')
const bank = ref([])
const papers = ref([])
const preview = ref([])
const saving = ref(false)

/** 默认截止：一周后 23:59 */
const defaultDeadline = () => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(23, 59, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

const form = reactive({
  title: '课堂检测卷',
  subjects: ['仿生学'],
  difficulty: '混合',
  chapter: '全部',
  questionType: '全部',
  count: 6,
  scoreTotal: 100,
  durationMin: 25,
  deadline: defaultDeadline(),
})

/** 题库知识点去重，作章节选项 */
const chapterOptions = computed(() => {
  const set = new Set(bank.value.map((q) => q.knowledgePoint).filter(Boolean))
  return ['全部', ...[...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))]
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    assertTeacher('组卷')
    const [questionRes, paperRes] = await Promise.all([fetchQuestions(), fetchPapers()])
    bank.value = questionRes
    papers.value = paperRes
  } catch (err) {
    error.value = err.message || err.userMessage || '组卷数据加载失败'
  } finally {
    loading.value = false
  }
}

const previewPaper = () => {
  if (!form.subjects.length) {
    ElMessage.warning('请至少选择一个科目')
    return
  }
  preview.value = composePaperQuestions(bank.value, {
    subjects: form.subjects,
    difficulty: form.difficulty,
    count: form.count,
    chapter: form.chapter,
    questionType: form.questionType,
  })
  if (!preview.value.length) {
    ElMessage.warning('题库不足，无法按当前条件抽题')
  } else {
    ElMessage.success(`已预览 ${preview.value.length} 题`)
  }
}

const savePaper = async () => {
  if (preview.value.length < 5) {
    ElMessage.warning('每套检测卷至少需要 5 题，请调整条件后重新预览')
    return
  }
  if (!form.deadline) {
    ElMessage.warning('请设置截止作答时间')
    return
  }
  saving.value = true
  try {
    assertTeacher('保存检测卷')
    await createPaper({
      title: form.title || '未命名检测卷',
      teacherId: profile.value.id,
      subjects: [...form.subjects],
      difficulty: form.difficulty,
      count: preview.value.length,
      questionIds: preview.value.map((item) => item.id),
      durationMin: form.durationMin,
      deadline: form.deadline,
      scoreTotal: Number(form.scoreTotal) || preview.value.length * 10,
      chapter: form.chapter,
      questionType: form.questionType,
      createdAt: new Date().toISOString(),
    })
    ElMessage.success('检测卷已保存，学生可在答题智测选卷')
    preview.value = []
    await load()
    emit('changed')
  } catch (err) {
    ElMessage.error(err.message || err.userMessage || '保存失败')
  } finally {
    saving.value = false
  }
}

const onRemove = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除「${row.title}」？`, '删除确认', { type: 'warning' })
    assertTeacher('删除检测卷')
    await removePaper(row.id)
    ElMessage.success('已删除')
    await load()
    emit('changed')
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || err.userMessage || '删除失败')
  }
}

onMounted(load)

defineExpose({ reload: load })
</script>

<template>
  <StateView :loading="loading" :error="error" @retry="load">
    <template #loading>
      <div class="bio-card p-5"><el-skeleton animated :rows="6" /></div>
    </template>

    <div class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <section class="bio-card p-4">
        <h2 class="text-base font-semibold">智能组卷</h2>
        <p class="mt-1 text-xs text-mist">
          配置难度、章节、题型、题量、分值、时长与截止时间；保存后学生仅可按卷作答。
        </p>

        <el-form class="mt-4" label-position="top">
          <el-form-item label="卷名（面向课堂）">
            <el-input v-model="form.title" maxlength="40" show-word-limit />
          </el-form-item>
          <el-form-item label="科目">
            <el-select v-model="form.subjects" multiple class="w-full" placeholder="选择科目">
              <el-option v-for="item in QUIZ_SUBJECTS" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <div class="grid gap-3 md:grid-cols-2">
            <el-form-item label="难度">
              <el-select v-model="form.difficulty" class="w-full">
                <el-option label="混合难度" value="混合" />
                <el-option v-for="item in DIFFICULTIES" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="章节">
              <el-select v-model="form.chapter" class="w-full" filterable>
                <el-option v-for="item in chapterOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="题型">
              <el-select v-model="form.questionType" class="w-full">
                <el-option label="全部题型" value="全部" />
                <el-option
                  v-for="item in QUESTION_TYPES"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="题量">
              <el-input-number v-model="form.count" :min="5" :max="15" class="full-number w-full" />
            </el-form-item>
            <el-form-item label="总分">
              <el-input-number v-model="form.scoreTotal" :min="10" :max="200" :step="10" class="full-number w-full" />
            </el-form-item>
            <el-form-item label="作答时长（分钟）">
              <el-input-number v-model="form.durationMin" :min="10" :max="90" class="full-number w-full" />
            </el-form-item>
          </div>
          <el-form-item label="截止作答时间">
            <el-date-picker
              v-model="form.deadline"
              type="datetime"
              class="!w-full"
              value-format="YYYY-MM-DDTHH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              placeholder="选择截止时间"
            />
          </el-form-item>
        </el-form>

        <div class="flex flex-wrap gap-2">
          <el-button type="primary" @click="previewPaper">预览抽题</el-button>
          <el-button
            v-if="canComposePaper"
            class="btn-accent"
            type="primary"
            :loading="saving"
            :disabled="preview.length < 5"
            @click="savePaper"
          >
            保存为检测卷
          </el-button>
        </div>
      </section>

      <section class="bio-card p-4">
        <h3 class="text-base font-semibold">抽题预览（{{ preview.length }}）</h3>
        <p v-if="preview.length > 0 && preview.length < 5" class="mt-2 text-sm text-red-400">
          当前条件仅能抽到 {{ preview.length }} 题；每套检测卷至少需要 5 题，请放宽科目、难度、章节或题型条件。
        </p>
        <StateView
          :loading="false"
          :empty="!preview.length"
          empty-title="尚未抽题"
          empty-text="设置条件后点击「预览抽题」。"
        >
          <ol class="mt-3 max-h-[420px] space-y-3 overflow-y-auto text-sm">
            <li v-for="(item, index) in preview" :key="item.id" class="rounded-xl border border-white/5 bg-ink/35 px-3 py-2">
              <p class="text-xs text-mist">
                {{ index + 1 }}. {{ item.subject }} · {{ item.difficulty }} · {{ item.knowledgePoint }}
              </p>
              <p class="mt-1 text-paper">{{ item.stem }}</p>
            </li>
          </ol>
        </StateView>
      </section>
    </div>

    <section class="bio-card mt-4 overflow-hidden p-4">
      <h3 class="mb-3 text-base font-semibold">已保存检测卷（{{ papers.length }}）</h3>
      <div class="overflow-x-auto">
        <el-table :data="papers" style="min-width: 880px">
          <el-table-column prop="title" label="卷名" min-width="180" />
          <el-table-column label="科目" min-width="140">
            <template #default="{ row }">
              {{ (row.subjects || []).join('、') }}
            </template>
          </el-table-column>
          <el-table-column prop="difficulty" label="难度" width="90" />
          <el-table-column prop="count" label="题量" width="70" />
          <el-table-column prop="scoreTotal" label="总分" width="70" />
          <el-table-column prop="durationMin" label="时长(分)" width="90" />
          <el-table-column label="截止时间" min-width="150">
            <template #default="{ row }">
              {{ formatDate(row.deadline) }}
            </template>
          </el-table-column>
          <el-table-column label="创建" min-width="140">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onRemove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </StateView>
</template>
