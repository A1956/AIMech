<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Star, StarFilled } from '@element-plus/icons-vue'
import { fetchCase, fetchCases, patchCase } from '@/api/case'
import { createRecord } from '@/api/record'
import CaseCard from '@/components/business/CaseCard.vue'
import CaseShortVideo from '@/components/business/CaseShortVideo.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StateView from '@/components/common/StateView.vue'
import { useAuth } from '@/composables/useAuth'
import { useFavorite } from '@/composables/useFavorite'
import { usePoints } from '@/composables/usePoints'
import { difficultyTone, formatDate } from '@/utils/format'

const route = useRoute()
const { profile } = useAuth()
const { has, toggle, pendingId } = useFavorite()
const { isCaseLocked } = usePoints()

const loading = ref(true)
const error = ref('')
const item = ref(null)
const related = ref([])

const favorited = computed(() => (item.value ? has(item.value.id) : false))
const locked = computed(() => (item.value ? isCaseLocked(item.value) : false))

const load = async () => {
  loading.value = true
  error.value = ''
  item.value = null
  try {
    const id = route.params.id
    const detail = await fetchCase(id)
    item.value = detail
    await patchCase(id, { views: Number(detail.views || 0) + 1 })
    item.value = { ...detail, views: Number(detail.views || 0) + 1 }
    if (profile.value?.id) {
      await createRecord({
        userId: profile.value.id,
        caseId: Number(id),
        type: 'view',
        createdAt: new Date().toISOString(),
      })
    }
    const all = await fetchCases()
    related.value = all.list
      .filter((c) => c.id !== detail.id && c.tags.some((t) => detail.tags.includes(t)))
      .slice(0, 3)
  } catch (err) {
    error.value = err.userMessage || '案例详情加载失败'
  } finally {
    loading.value = false
  }
}

const onFavorite = async () => {
  if (!item.value) return
  await toggle(item.value)
  // toggle 内已更新 likes，再拉一次保证与 mock 一致
  item.value = await fetchCase(item.value.id)
}

watch(() => route.params.id, load)
onMounted(load)
</script>

<template>
  <div>
    <StateView :loading="loading" :error="error" :empty="!item" empty-title="案例不存在" @retry="load">
      <template #loading>
        <div class="bio-card p-6"><el-skeleton animated :rows="10" /></div>
      </template>

      <template v-if="item">
        <PageHeader :title="item.title" :subtitle="`收录于 ${formatDate(item.createdAt)} · 浏览 ${item.views} · 收藏 ${item.likes}`">
          <el-button
            :type="favorited ? 'warning' : 'primary'"
            :loading="pendingId === item.id"
            @click="onFavorite"
          >
            <el-icon class="mr-1"><component :is="favorited ? StarFilled : Star" /></el-icon>
            {{ favorited ? '已收藏' : '收藏' }}
          </el-button>
        </PageHeader>

        <div v-if="locked" class="bio-card mb-5 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold text-sand">进阶内容需积分解锁</p>
            <p class="mt-1 text-sm text-mist">消耗 40 积分可解锁本案例完整机理与参数表。</p>
          </div>
          <router-link to="/rewards">
            <el-button type="warning">使用积分解锁</el-button>
          </router-link>
        </div>

        <div class="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div class="space-y-5">
            <div class="bio-card overflow-hidden">
              <img :src="item.cover" :alt="item.title" class="h-56 w-full object-cover md:h-72" />
              <div class="flex flex-wrap gap-2 p-4">
                <span class="rounded-full bg-teal/20 px-3 py-1 text-xs" :class="difficultyTone(item.difficulty)">
                  {{ item.difficulty }}
                </span>
                <span v-for="tag in item.tags" :key="tag" class="rounded-full bg-white/5 px-3 py-1 text-xs text-mist">
                  {{ tag }}
                </span>
              </div>
            </div>

            <CaseShortVideo :case-id="item.id" :title="item.title" />

            <section class="bio-card p-5">
              <h2 class="text-base font-semibold text-accent">生物原型</h2>
              <p class="mt-2 text-sm leading-7 text-paper/90">
                {{ locked ? '内容已锁定，请先兑换解锁。' : item.bioPrototype }}
              </p>
            </section>
            <section class="bio-card p-5">
              <h2 class="text-base font-semibold text-accent">仿生原理</h2>
              <p class="mt-2 text-sm leading-7 text-paper/90">
                {{ locked ? '解锁后可查看完整仿生原理推导。' : item.principle }}
              </p>
            </section>
            <section class="bio-card p-5">
              <h2 class="text-base font-semibold text-accent">机械结构方案</h2>
              <p class="mt-2 text-sm leading-7 text-paper/90">
                {{ locked ? '解锁后可查看结构方案细节。' : item.structure }}
              </p>
            </section>
          </div>

          <div class="space-y-5">
            <section class="bio-card p-5">
              <h2 class="mb-3 text-base font-semibold">关键参数表</h2>
              <div v-if="locked" class="rounded-xl border border-dashed border-[color:var(--bio-line)] px-4 py-8 text-center text-sm text-mist">
                参数表已锁定
              </div>
              <div v-else class="overflow-x-auto">
                <el-table :data="item.params" size="small" style="min-width: 420px">
                  <el-table-column prop="name" label="参数" min-width="100" />
                  <el-table-column prop="symbol" label="符号" width="80" />
                  <el-table-column prop="value" label="取值" min-width="110" />
                  <el-table-column prop="unit" label="单位" width="80" />
                  <el-table-column prop="note" label="设计提示" min-width="180" />
                </el-table>
              </div>
            </section>

            <section class="bio-card p-5">
              <h2 class="mb-3 text-base font-semibold">工程应用</h2>
              <ul v-if="!locked" class="space-y-2 text-sm text-mist">
                <li v-for="app in item.applications" :key="app" class="flex gap-2">
                  <span class="text-accent">▸</span>
                  <span>{{ app }}</span>
                </li>
              </ul>
              <p v-else class="text-sm text-mist">解锁后显示工程应用场景。</p>
              <router-link class="mt-4 inline-block text-sm text-accent hover:underline" to="/design">
                用参数推荐验证工况 →
              </router-link>
            </section>
          </div>
        </div>

        <section v-if="related.length" class="mt-8">
          <h2 class="mb-3 text-lg font-semibold">相关案例</h2>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CaseCard v-for="(c, index) in related" :key="c.id" :item="c" :index="index" />
          </div>
        </section>
      </template>
    </StateView>
  </div>
</template>
