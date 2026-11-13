<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { fetchCases } from '@/api/case'
import CaseCard from '@/components/business/CaseCard.vue'
import BackToTop from '@/components/common/BackToTop.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StateView from '@/components/common/StateView.vue'
import { useRevealOnScroll } from '@/composables/useRevealOnScroll'
import { DIFFICULTIES, SORT_OPTIONS } from '@/types'

const keyword = ref('')
const tag = ref('')
const difficulty = ref('')
const sort = ref('createdAt')
const allCases = ref([])
const sourceError = ref('')
const sourceLoading = ref(true)
const pageSize = 6
const visibleCount = ref(pageSize)
const sentinelRef = ref(null)
let loadObserver = null

const allTags = computed(() => {
  const set = new Set()
  allCases.value.forEach((item) => item.tags?.forEach((t) => set.add(t)))
  return [...set]
})

const filtered = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  let list = [...allCases.value]
  if (key) {
    list = list.filter((item) => {
      const blob = [item.title, item.bioPrototype, item.principle, item.structure, ...(item.tags || [])]
        .join(' ')
        .toLowerCase()
      return blob.includes(key)
    })
  }
  if (tag.value) list = list.filter((item) => item.tags?.includes(tag.value))
  if (difficulty.value) list = list.filter((item) => item.difficulty === difficulty.value)
  list.sort((a, b) => {
    if (sort.value === 'views' || sort.value === 'likes') return Number(b[sort.value]) - Number(a[sort.value])
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  return list
})

const list = computed(() => filtered.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filtered.value.length)

const { isVisible, setRevealRef, reset } = useRevealOnScroll(list)

const loadMore = () => {
  if (!hasMore.value) return
  visibleCount.value = Math.min(visibleCount.value + pageSize, filtered.value.length)
}

const setupSentinel = () => {
  if (loadObserver) {
    loadObserver.disconnect()
    loadObserver = null
  }
  if (!sentinelRef.value || typeof IntersectionObserver === 'undefined') return
  loadObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore()
    },
    { root: null, rootMargin: '120px 0px', threshold: 0 },
  )
  loadObserver.observe(sentinelRef.value)
}

const loadSource = async () => {
  sourceLoading.value = true
  sourceError.value = ''
  try {
    const res = await fetchCases({ _sort: 'createdAt', _order: 'desc' })
    allCases.value = res.list
    visibleCount.value = pageSize
    reset()
  } catch (err) {
    sourceError.value = err.userMessage || '案例加载失败'
  } finally {
    sourceLoading.value = false
    await nextTick()
    setupSentinel()
  }
}

watch([keyword, tag, difficulty, sort], async () => {
  visibleCount.value = pageSize
  reset()
  await nextTick()
  setupSentinel()
})

watch(hasMore, async () => {
  await nextTick()
  setupSentinel()
})

onMounted(loadSource)

onUnmounted(() => {
  if (loadObserver) {
    loadObserver.disconnect()
    loadObserver = null
  }
})
</script>

<template>
  <div>
    <PageHeader title="案例库" subtitle="智慧搜索：按生物原型、仿生机理与工程参数检索；下滑逐步显示案例。" />

    <div class="bio-card mb-5 p-4">
      <p class="mb-3 text-xs font-medium text-accent">智慧搜索</p>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <el-input v-model="keyword" clearable placeholder="搜索标题 / 机理 / 标签" />
        <el-select v-model="tag" clearable placeholder="标签筛选" class="w-full">
          <el-option v-for="item in allTags" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="difficulty" clearable placeholder="难度" class="w-full">
          <el-option v-for="item in DIFFICULTIES" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="sort" placeholder="排序" class="w-full">
          <el-option v-for="item in SORT_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
    </div>

    <StateView
      :loading="sourceLoading"
      :error="sourceError"
      :empty="!filtered.length"
      empty-title="没有匹配的案例"
      empty-text="试试清空标签或换一个关键词。"
      @retry="loadSource"
    >
      <template #loading>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div v-for="n in 6" :key="n" class="bio-card p-4"><el-skeleton animated :rows="4" /></div>
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="(item, index) in list"
          :key="item.id"
          class="case-reveal"
          :class="{ 'is-shown': isVisible(item.id) }"
          :data-reveal-id="item.id"
          :ref="setRevealRef(item.id)"
        >
          <CaseCard :item="item" :index="index" />
        </div>
      </div>
      <div ref="sentinelRef" class="h-8" aria-hidden="true" />
      <p v-if="hasMore" class="mt-2 text-center text-xs text-mist">继续下滑加载更多…</p>
      <p v-else-if="list.length" class="mt-2 text-center text-xs text-mist">已显示全部 {{ filtered.length }} 个案例</p>
    </StateView>

    <BackToTop :threshold="260" />
  </div>
</template>
