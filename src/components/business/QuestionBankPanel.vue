<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createQuestion,
  fetchQuestions,
  removeQuestion,
  updateQuestion,
} from '@/api/question'
import StateView from '@/components/common/StateView.vue'
import { usePermission } from '@/composables/usePermission'
import { DIFFICULTIES, QUESTION_TYPES, QUIZ_SUBJECTS } from '@/types'

const emit = defineEmits(['changed'])
const { assertTeacher, canManageQuestions } = usePermission()

const loading = ref(true)
const error = ref('')
const list = ref([])
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref(null)
const formRef = ref(null)
const filter = reactive({
  subject: '',
  difficulty: '',
})

const emptyForm = () => ({
  subject: '仿生学',
  knowledgePoint: '',
  difficulty: '入门',
  type: 'single',
  stem: '',
  optionsText: '选项A\n选项B\n选项C\n选项D',
  answer: '',
  analysis: '',
  caseId: null,
})

const form = reactive(emptyForm())

const rules = {
  subject: [{ required: true, message: '请选择科目', trigger: 'change' }],
  knowledgePoint: [{ required: true, message: '请填写知识点', trigger: 'blur' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  type: [{ required: true, message: '请选择题型', trigger: 'change' }],
  stem: [{ required: true, message: '请填写题干', trigger: 'blur' }],
  answer: [{ required: true, message: '请填写标准答案', trigger: 'blur' }],
  analysis: [{ required: true, message: '请填写解析', trigger: 'blur' }],
}

const filtered = computed(() =>
  list.value.filter((item) => {
    const subjectOk = !filter.subject || item.subject === filter.subject
    const diffOk = !filter.difficulty || item.difficulty === filter.difficulty
    return subjectOk && diffOk
  }),
)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    assertTeacher('管理题库')
    list.value = await fetchQuestions()
  } catch (err) {
    error.value = err.message || err.userMessage || '题库加载失败'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  Object.assign(form, emptyForm())
  dialogVisible.value = true
}

const openEdit = (row) => {
  editingId.value = row.id
  Object.assign(form, {
    subject: row.subject,
    knowledgePoint: row.knowledgePoint,
    difficulty: row.difficulty,
    type: row.type,
    stem: row.stem,
    optionsText: (row.options || []).join('\n'),
    answer: row.answer,
    analysis: row.analysis,
    caseId: row.caseId || null,
  })
  dialogVisible.value = true
}

const save = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const options = form.optionsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (options.length < 2) {
    ElMessage.warning('至少需要两个选项')
    return
  }
  if (!options.includes(form.answer)) {
    ElMessage.warning('标准答案必须出现在选项中')
    return
  }
  saving.value = true
  try {
    assertTeacher('保存题目')
    const payload = {
      subject: form.subject,
      knowledgePoint: form.knowledgePoint,
      difficulty: form.difficulty,
      type: form.type,
      stem: form.stem,
      options,
      answer: form.answer,
      analysis: form.analysis,
      caseId: form.caseId || null,
      createdAt: new Date().toISOString(),
    }
    if (editingId.value) {
      const prev = list.value.find((item) => item.id === editingId.value)
      await updateQuestion(editingId.value, {
        ...payload,
        createdAt: prev?.createdAt || payload.createdAt,
      })
      ElMessage.success('题目已更新')
    } else {
      await createQuestion(payload)
      ElMessage.success('题目已入库')
    }
    dialogVisible.value = false
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
    await ElMessageBox.confirm(`确认删除题目「${row.stem.slice(0, 24)}…」？`, '删除确认', {
      type: 'warning',
    })
    assertTeacher('删除题目')
    await removeQuestion(row.id)
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

    <section class="bio-card overflow-hidden p-4">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold">智能题库（{{ filtered.length }}）</h2>
          <p class="text-xs text-mist">面向课堂命题：机械设计 / 仿生学 / 机器人，仅教师可增删改</p>
        </div>
        <el-button v-if="canManageQuestions" type="primary" class="btn-accent" @click="openCreate">
          新增题目
        </el-button>
      </div>

      <div class="mb-4 flex flex-wrap gap-3">
        <el-select v-model="filter.subject" clearable placeholder="科目" class="w-40">
          <el-option v-for="item in QUIZ_SUBJECTS" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="filter.difficulty" clearable placeholder="难度" class="w-40">
          <el-option v-for="item in DIFFICULTIES" :key="item" :label="item" :value="item" />
        </el-select>
      </div>

      <div class="overflow-x-auto">
        <el-table :data="filtered" style="min-width: 860px">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="subject" label="科目" width="100" />
          <el-table-column prop="knowledgePoint" label="知识点" min-width="140" />
          <el-table-column prop="difficulty" label="难度" width="90" />
          <el-table-column prop="stem" label="题干" min-width="260" show-overflow-tooltip />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="onRemove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑题目' : '新增题目'"
      width="92%"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="grid gap-3 md:grid-cols-2">
          <el-form-item label="科目" prop="subject">
            <el-select v-model="form.subject" class="w-full">
              <el-option v-for="item in QUIZ_SUBJECTS" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="知识点" prop="knowledgePoint">
            <el-input v-model="form.knowledgePoint" maxlength="40" />
          </el-form-item>
          <el-form-item label="难度" prop="difficulty">
            <el-select v-model="form.difficulty" class="w-full">
              <el-option v-for="item in DIFFICULTIES" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="题型" prop="type">
            <el-select v-model="form.type" class="w-full">
              <el-option
                v-for="item in QUESTION_TYPES"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="题干" prop="stem">
          <el-input v-model="form.stem" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="选项（每行一个）">
          <el-input v-model="form.optionsText" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="标准答案" prop="answer">
          <el-input v-model="form.answer" />
        </el-form-item>
        <el-form-item label="解析（给学生看）" prop="analysis">
          <el-input v-model="form.analysis" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="关联案例 ID（可选）">
          <el-input-number v-model="form.caseId" :min="0" class="full-number" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </StateView>
</template>
