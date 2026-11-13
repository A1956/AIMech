<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { fetchCases } from '@/api/case'
import GearMeshPreview from '@/components/business/GearMeshPreview.vue'
import PrincipleDiagram from '@/components/business/PrincipleDiagram.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StateView from '@/components/common/StateView.vue'
import { ENVIRONMENTS, PRECISIONS } from '@/types'
import { recommendSchemes } from '@/utils/designEngine'

/** @typedef {'idle' | 'calculating' | 'ready'} DesignPhase */

const formRef = ref(null)
const loading = ref(true)
const error = ref('')
const cases = ref([])
const result = ref(null)
const submitting = ref(false)
const activeCaseId = ref(null)
const phase = ref(/** @type {DesignPhase} */ ('idle'))

const form = reactive({
  load: 80,
  stroke: 60,
  environment: 'dry',
  precision: 'normal',
  weightLimit: 3,
})

const rules = {
  load: [{ required: true, message: '请输入载荷', trigger: 'blur' }],
  stroke: [{ required: true, message: '请输入行程', trigger: 'blur' }],
  environment: [{ required: true, message: '请选择环境', trigger: 'change' }],
  precision: [{ required: true, message: '请选择精度', trigger: 'change' }],
  weightLimit: [{ required: true, message: '请输入重量上限', trigger: 'blur' }],
}

const caseMap = computed(() => Object.fromEntries(cases.value.map((item) => [item.id, item])))

const schemes = computed(() => result.value?.schemes || [])

const activeScheme = computed(
  () => schemes.value.find((item) => item.caseId === activeCaseId.value) || schemes.value[0] || null,
)

const diagramAnnotations = computed(() => ({
  load: form.load,
  stroke: form.stroke,
  specificLoad: result.value?.specificLoad,
  weightLimit: form.weightLimit,
  media: result.value?.media,
}))

const showGearPreview = computed(() => phase.value === 'idle' || phase.value === 'calculating')
const showResult = computed(() => phase.value === 'ready' && !!result.value)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchCases()
    cases.value = res.list
  } catch (err) {
    error.value = err.userMessage || '案例加载失败'
  } finally {
    loading.value = false
  }
}

const calcDelayMs = () => 2000

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const run = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  phase.value = 'calculating'
  try {
    await wait(calcDelayMs())
    result.value = recommendSchemes({ ...form })
    activeCaseId.value = result.value.schemes[0]?.caseId ?? null
    phase.value = 'ready'
  } finally {
    submitting.value = false
  }
}

const selectScheme = (caseId) => {
  activeCaseId.value = caseId
}

watch(
  () => schemes.value.map((s) => s.caseId).join(','),
  () => {
    if (!schemes.value.some((s) => s.caseId === activeCaseId.value)) {
      activeCaseId.value = schemes.value[0]?.caseId ?? null
    }
  },
)

onMounted(() => {
  load()
})
</script>

<template>
  <div>
    <PageHeader
      title="智慧方案推荐"
      subtitle="输入载荷、行程、介质、精度与重量上限；可切换原理图并在图中标注关键数据。"
    />

    <StateView :loading="loading" :error="error" @retry="load">
      <div class="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section class="bio-card p-5">
          <h2 class="mb-4 text-base font-semibold">设计约束</h2>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <el-form-item label="载荷 (N)" prop="load">
              <el-input-number v-model="form.load" class="full-number" :min="1" :max="5000" :step="10" />
            </el-form-item>
            <el-form-item label="行程 / 特征尺度 (mm)" prop="stroke">
              <el-input-number v-model="form.stroke" class="full-number" :min="1" :max="5000" :step="10" />
            </el-form-item>
            <el-form-item label="工作环境" prop="environment">
              <el-select v-model="form.environment" class="w-full">
                <el-option v-for="item in ENVIRONMENTS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="精度目标" prop="precision">
              <el-select v-model="form.precision" class="w-full">
                <el-option v-for="item in PRECISIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="重量上限 (kg)" prop="weightLimit">
              <el-input-number v-model="form.weightLimit" class="full-number" :min="0.1" :max="200" :step="0.5" />
            </el-form-item>
            <el-button type="primary" class="btn-accent w-full" :loading="submitting" @click="run">
              生成推荐方案
            </el-button>
          </el-form>
        </section>

        <section class="space-y-4">
          <GearMeshPreview
            v-if="showGearPreview"
            :spinning="phase === 'calculating'"
            title="请确定参数"
            hint="调整左侧约束后点击生成"
          />

          <template v-if="showResult">
            <div class="bio-card p-4 text-sm text-mist">
              比载荷约 <span class="text-paper">{{ result.specificLoad.toFixed(1) }} N/kg</span>
              · 介质 <span class="text-paper">{{ result.media }}</span>
              · 精度 <span class="text-paper">{{ result.precision }}</span>
            </div>

            <div v-if="activeScheme" class="space-y-3">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="scheme in schemes"
                  :key="scheme.caseId"
                  type="button"
                  class="rounded-full border px-3 py-1.5 text-xs transition"
                  :class="
                    activeCaseId === scheme.caseId
                      ? 'border-teal bg-teal/15 text-teal'
                      : 'border-[color:var(--bio-line)] text-mist hover:border-teal/50'
                  "
                  @click="selectScheme(scheme.caseId)"
                >
                  {{ scheme.rank }} · {{ scheme.title }}
                </button>
              </div>
              <PrincipleDiagram
                :case-id="activeScheme.caseId"
                :title="activeScheme.title"
                :focus="activeScheme.focus"
                :annotations="diagramAnnotations"
              />
            </div>

            <article
              v-for="(scheme, index) in schemes"
              :key="scheme.caseId"
              class="bio-card rise-in cursor-pointer p-5 transition ring-offset-2"
              :class="{ 'ring-2 ring-teal/50': activeCaseId === scheme.caseId }"
              :style="{ '--i': index }"
              @click="selectScheme(scheme.caseId)"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-accent">{{ scheme.rank }} · 匹配分 {{ scheme.score }}</p>
                  <h3 class="mt-1 text-lg font-semibold">{{ scheme.title }}</h3>
                  <p class="mt-1 text-sm text-mist">关键参数焦点：{{ scheme.focus }}</p>
                </div>
                <router-link
                  v-if="caseMap[scheme.caseId]"
                  :to="`/cases/${scheme.caseId}`"
                  class="text-sm text-accent hover:underline"
                  @click.stop
                >
                  打开案例
                </router-link>
              </div>
              <ul class="mt-4 space-y-2 text-sm leading-7 text-paper/90">
                <li v-for="reason in scheme.reasons" :key="reason" class="flex gap-2">
                  <span class="text-accent">●</span>
                  <span>{{ reason }}</span>
                </li>
              </ul>
              <p class="mt-3 rounded-xl bg-ink/50 px-3 py-2 text-sm text-sand">注意：{{ scheme.caution }}</p>
            </article>
          </template>
        </section>
      </div>
    </StateView>
  </div>
</template>
