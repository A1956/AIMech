<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchKnowledgeWeakness,
  fetchQuestionStats,
  fetchVideos,
} from '@/api/analytics'
import { createCase, fetchCases, removeCase, updateCase } from '@/api/case'
import { fetchAllMessages } from '@/api/chat'
import { fetchCourses } from '@/api/course'
import { fetchQuestions } from '@/api/question'
import { fetchQuizAttempts } from '@/api/quiz'
import { fetchUsers } from '@/api/user'
import PaperComposer from '@/components/business/PaperComposer.vue'
import QuestionBankPanel from '@/components/business/QuestionBankPanel.vue'
import TeacherInsights from '@/components/business/TeacherInsights.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StateView from '@/components/common/StateView.vue'
import { usePermission } from '@/composables/usePermission'
import { COVER_OPTIONS, DIFFICULTIES, PRESET_TAGS } from '@/types'
import { ADMIN_TABS, PAGE_TITLES } from '@/types/labels'
import {
  aggregateHotWrongQuestions,
  enrichWeakPoints,
  mergeHotQuestions,
  rankHotVideos,
  summarizeTeachingDuration,
} from '@/utils/teacherAnalytics'

const { canManageCases, assertTeacher } = usePermission()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const allowedTabs = ['insights', 'cases', 'questions', 'papers', 'users']
const activeTab = ref(
  allowedTabs.includes(String(route.query.tab || '')) ? String(route.query.tab) : 'insights',
)

watch(activeTab, (tab) => {
  if (route.query.tab === tab) return
  router.replace({ query: { ...route.query, tab } })
})

watch(
  () => route.query.tab,
  (tab) => {
    const next = String(tab || 'insights')
    if (allowedTabs.includes(next) && activeTab.value !== next) activeTab.value = next
    else if (!allowedTabs.includes(next)) router.replace({ query: { ...route.query, tab: 'insights' } })
  },
  { immediate: true },
)
const cases = ref([])
const users = ref([])
const courses = ref([])
const hotQuestions = ref([])
const hotWrongQuestions = ref([])
const hotVideos = ref([])
const weakPoints = ref([])
const teachingDuration = ref({
  courseMinutes: 0,
  videoMinutes: 0,
  totalMinutes: 0,
  courseHours: 0,
  videoHours: 0,
})
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref(null)
const formRef = ref(null)

const students = computed(() => users.value.filter((item) => item.role === 'student'))

const emptyForm = () => ({
  title: '',
  bioPrototype: '',
  principle: '',
  structure: '',
  paramsText: '参数名|符号|取值|单位|提示',
  applicationsText: '',
  tags: [],
  difficulty: '入门',
  cover: COVER_OPTIONS[0].src,
  views: 0,
  likes: 0,
})

const form = reactive(emptyForm())

const rules = {
  title: [{ required: true, message: '请填写标题', trigger: 'blur' }],
  bioPrototype: [{ required: true, message: '请填写生物原型', trigger: 'blur' }],
  principle: [{ required: true, message: '请填写仿生原理', trigger: 'blur' }],
  structure: [{ required: true, message: '请填写结构方案', trigger: 'blur' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  cover: [{ required: true, message: '请选择封面', trigger: 'change' }],
}

const parseParams = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, symbol, value, unit, note] = line.split('|').map((part) => part?.trim() || '')
      return { name, symbol, value, unit, note }
    })
    .filter((item) => item.name)

const serializeParams = (params = []) =>
  params.map((item) => [item.name, item.symbol, item.value, item.unit, item.note].join('|')).join('\n')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    assertTeacher('进入智能教学台')
    const [
      caseRes,
      userRes,
      courseRes,
      questionStatRes,
      videoRes,
      weakRes,
      messageRes,
      bankRes,
      attemptRes,
    ] = await Promise.all([
      fetchCases({ _sort: 'id', _order: 'asc' }),
      fetchUsers(),
      fetchCourses(),
      fetchQuestionStats(),
      fetchVideos(),
      fetchKnowledgeWeakness(),
      fetchAllMessages(),
      fetchQuestions(),
      fetchQuizAttempts(),
    ])
    cases.value = caseRes.list
    users.value = userRes
    courses.value = courseRes
    hotQuestions.value = mergeHotQuestions(questionStatRes, messageRes)
    hotWrongQuestions.value = aggregateHotWrongQuestions(attemptRes, bankRes)
    hotVideos.value = rankHotVideos(videoRes)
    weakPoints.value = enrichWeakPoints(weakRes, userRes, courseRes)
    teachingDuration.value = summarizeTeachingDuration(courseRes, videoRes)
  } catch (err) {
    error.value = err.message || err.userMessage || '智能教学台加载失败'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  assertTeacher('新增案例')
  editingId.value = null
  Object.assign(form, emptyForm())
  dialogVisible.value = true
}

const openEdit = (item) => {
  assertTeacher('编辑案例')
  editingId.value = item.id
  Object.assign(form, {
    title: item.title,
    bioPrototype: item.bioPrototype,
    principle: item.principle,
    structure: item.structure,
    paramsText: serializeParams(item.params),
    applicationsText: (item.applications || []).join('\n'),
    tags: [...(item.tags || [])],
    difficulty: item.difficulty,
    cover: item.cover,
    views: item.views,
    likes: item.likes,
  })
  dialogVisible.value = true
}

const save = async () => {
  assertTeacher('保存案例')
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const params = parseParams(form.paramsText)
  if (!params.length) {
    ElMessage.warning('请至少填写一行参数，格式：名称|符号|取值|单位|提示')
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.title,
      bioPrototype: form.bioPrototype,
      principle: form.principle,
      structure: form.structure,
      params,
      applications: form.applicationsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      tags: form.tags,
      difficulty: form.difficulty,
      cover: form.cover,
      views: Number(form.views || 0),
      likes: Number(form.likes || 0),
      createdAt: editingId.value
        ? cases.value.find((item) => item.id === editingId.value)?.createdAt
        : new Date().toISOString(),
    }
    if (editingId.value) await updateCase(editingId.value, payload)
    else await createCase(payload)
    ElMessage.success(editingId.value ? '案例已更新' : '案例已创建')
    dialogVisible.value = false
    await load()
  } catch (err) {
    ElMessage.error(err.message || err.userMessage || '保存失败')
  } finally {
    saving.value = false
  }
}

const onRemove = async (item) => {
  assertTeacher('删除案例')
  await ElMessageBox.confirm(`确认删除「${item.title}」？此操作不可撤销。`, '删除案例', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
  await removeCase(item.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader
      :title="PAGE_TITLES.admin"
      subtitle="教师专属：智能学情、案例管理、智能题库与智能组卷。智能教学路径和个人教学档案请从左侧导航查看。"
    >
      <el-button
        v-if="canManageCases && activeTab === 'cases'"
        type="primary"
        class="btn-accent"
        @click="openCreate"
      >
        新增案例
      </el-button>
    </PageHeader>

    <StateView :loading="loading" :error="error" @retry="load">
      <template #loading>
        <div class="bio-card p-5"><el-skeleton animated :rows="8" /></div>
      </template>

      <el-tabs v-model="activeTab" class="teacher-tabs">
        <el-tab-pane :label="ADMIN_TABS.insights" name="insights">
          <TeacherInsights
            :hot-questions="hotQuestions"
            :hot-wrong-questions="hotWrongQuestions"
            :hot-videos="hotVideos"
            :weak-points="weakPoints"
            :student-count="students.length"
            :teaching-duration="teachingDuration"
          />
        </el-tab-pane>

        <el-tab-pane :label="ADMIN_TABS.cases" name="cases">
          <section class="bio-card overflow-hidden p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-base font-semibold">{{ ADMIN_TABS.cases }}（{{ cases.length }}）</h2>
              <p class="text-xs text-mist">案例资源管理：支持新增、编辑与删除，仅教师可操作</p>
            </div>
            <div class="overflow-x-auto">
              <el-table :data="cases" style="min-width: 720px">
                <el-table-column prop="id" label="ID" width="70" />
                <el-table-column prop="title" label="标题" min-width="200" />
                <el-table-column prop="difficulty" label="难度" width="90" />
                <el-table-column prop="views" label="浏览" width="80" />
                <el-table-column prop="likes" label="收藏" width="80" />
                <el-table-column label="操作" width="180" fixed="right">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                    <el-button link type="danger" @click="onRemove(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </section>
        </el-tab-pane>

        <el-tab-pane :label="ADMIN_TABS.questions" name="questions" lazy>
          <QuestionBankPanel @changed="load" />
        </el-tab-pane>

        <el-tab-pane :label="ADMIN_TABS.papers" name="papers" lazy>
          <PaperComposer @changed="load" />
        </el-tab-pane>

        <el-tab-pane :label="ADMIN_TABS.users" name="users">
          <section class="bio-card overflow-hidden p-4">
            <h2 class="mb-3 text-base font-semibold">{{ ADMIN_TABS.users }}（{{ users.length }}）</h2>
            <div class="overflow-x-auto">
              <el-table :data="users" style="min-width: 560px">
                <el-table-column prop="id" label="ID" width="70" />
                <el-table-column prop="name" label="姓名" min-width="120" />
                <el-table-column prop="username" label="账号" min-width="100" />
                <el-table-column label="角色" width="100">
                  <template #default="{ row }">
                    {{ row.role === 'teacher' ? '教师' : '学生' }}
                  </template>
                </el-table-column>
                <el-table-column label="完成节点" width="110">
                  <template #default="{ row }">
                    {{ row.progress?.completedCourseIds?.length || 0 }} / {{ courses.length }}
                  </template>
                </el-table-column>
                <el-table-column label="最近学时记录" min-width="160">
                  <template #default="{ row }">
                    {{ row.progress?.studyLog?.slice(-1)[0]?.date || '—' }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </section>
        </el-tab-pane>
      </el-tabs>
    </StateView>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑案例' : '新增案例'"
      width="92%"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="60" show-word-limit />
        </el-form-item>
        <el-form-item label="生物原型" prop="bioPrototype">
          <el-input v-model="form.bioPrototype" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="仿生原理" prop="principle">
          <el-input v-model="form.principle" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="机械结构方案" prop="structure">
          <el-input v-model="form.structure" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="参数表（每行：名称|符号|取值|单位|提示）">
          <el-input v-model="form.paramsText" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="工程应用（每行一条）">
          <el-input v-model="form.applicationsText" type="textarea" :rows="3" />
        </el-form-item>
        <div class="grid gap-3 md:grid-cols-2">
          <el-form-item label="标签">
            <el-select v-model="form.tags" multiple filterable allow-create class="w-full" placeholder="选择或输入标签">
              <el-option v-for="tag in PRESET_TAGS" :key="tag" :label="tag" :value="tag" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度" prop="difficulty">
            <el-select v-model="form.difficulty" class="w-full">
              <el-option v-for="item in DIFFICULTIES" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="封面" prop="cover">
            <el-select v-model="form.cover" class="w-full">
              <el-option v-for="item in COVER_OPTIONS" :key="item.src" :label="item.label" :value="item.src" />
            </el-select>
          </el-form-item>
          <el-form-item label="浏览量">
            <el-input-number v-model="form.views" class="full-number" :min="0" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
