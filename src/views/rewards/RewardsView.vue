<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchCases } from '@/api/case'
import PageHeader from '@/components/common/PageHeader.vue'
import StateView from '@/components/common/StateView.vue'
import { usePoints } from '@/composables/usePoints'
import { INVENTORY_LABELS, LOCKED_DIFFICULTIES, POINTS_RULES } from '@/types/points'
import { PAGE_TITLES } from '@/types/labels'

const { points, chatQuota, inventory, freeLeftToday, redeem, refreshPoints, isCaseLocked, listOffers } =
  usePoints()

const loading = ref(true)
const error = ref('')
const offers = ref([])
const cases = ref([])
const redeeming = ref('')
const selectedCaseId = ref(null)

const lockedCases = computed(() =>
  cases.value.filter((item) => LOCKED_DIFFICULTIES.includes(item.difficulty) && isCaseLocked(item)),
)

const inventoryText = computed(() => {
  if (!inventory.value.length) return '暂无'
  return inventory.value.map((key) => INVENTORY_LABELS[key] || key).join('、')
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    await refreshPoints()
    const [offerList, caseRes] = await Promise.all([listOffers(), fetchCases()])
    offers.value = offerList
    cases.value = caseRes.list
    if (!selectedCaseId.value && lockedCases.value.length) {
      selectedCaseId.value = lockedCases.value[0].id
    }
  } catch (err) {
    error.value = err.userMessage || '兑换页加载失败'
  } finally {
    loading.value = false
  }
}

const onRedeem = async (offer) => {
  if (redeeming.value) return
  redeeming.value = offer.id
  try {
    const payload = { offerId: offer.id }
    if (offer.kind === 'unlock_case') {
      if (!selectedCaseId.value) {
        ElMessage.warning('请选择要解锁的案例')
        return
      }
      payload.caseId = selectedCaseId.value
    }
    const ok = await redeem(payload)
    if (ok) {
      const caseRes = await fetchCases()
      cases.value = caseRes.list
      if (lockedCases.value.length) selectedCaseId.value = lockedCases.value[0].id
      else selectedCaseId.value = null
    }
  } finally {
    redeeming.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader
      :title="PAGE_TITLES.rewards"
      subtitle="每日领积分、学习加分，兑换问答次数、进阶案例与学习道具，形成学习闭环。"
    />

    <StateView :loading="loading" :error="error" @retry="load">
      <template #loading>
        <div class="bio-card p-6"><el-skeleton animated :rows="8" /></div>
      </template>

      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="bio-card p-4">
          <p class="text-xs text-mist">当前积分</p>
          <p class="mt-1 text-2xl font-semibold text-sand">{{ points }}</p>
        </div>
        <div class="bio-card p-4">
          <p class="text-xs text-mist">问答余量</p>
          <p class="mt-1 text-2xl font-semibold">{{ chatQuota }}</p>
          <p class="mt-1 text-xs text-mist">今日免费剩余 {{ freeLeftToday }} / {{ POINTS_RULES.dailyFreeChat }}</p>
        </div>
        <div class="bio-card p-4 sm:col-span-2">
          <p class="text-xs text-mist">学习道具</p>
          <p class="mt-1 text-sm">{{ inventoryText }}</p>
        </div>
      </section>

      <section class="mt-6">
        <h2 class="mb-3 text-lg font-semibold">兑换目录</h2>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="offer in offers"
            :key="offer.id"
            class="bio-card flex flex-col p-5"
          >
            <h3 class="font-semibold">{{ offer.title }}</h3>
            <p class="mt-2 flex-1 text-sm leading-6 text-mist">{{ offer.desc }}</p>
            <p class="mt-3 text-sm">
              消耗 <span class="font-semibold text-sand">{{ offer.cost }}</span> 积分
            </p>

            <div v-if="offer.kind === 'unlock_case'" class="mt-3">
              <p class="mb-1 text-xs text-mist">选择要解锁的案例</p>
              <el-select
                v-model="selectedCaseId"
                placeholder="暂无待解锁案例"
                class="w-full"
                :disabled="!lockedCases.length"
              >
                <el-option
                  v-for="item in lockedCases"
                  :key="item.id"
                  :label="`${item.title}（${item.difficulty}）`"
                  :value="item.id"
                />
              </el-select>
            </div>

            <el-button
              class="mt-4"
              type="primary"
              :disabled="points < offer.cost || (offer.kind === 'unlock_case' && !selectedCaseId)"
              :loading="redeeming === offer.id"
              @click="onRedeem(offer)"
            >
              立即兑换
            </el-button>
          </article>
        </div>
      </section>

      <p class="mt-6 text-xs text-mist">
        规则提示：每日领积分 +{{ POINTS_RULES.dailyClaim }}；完成路径节点 +{{ POINTS_RULES.pathComplete }}；完成自测 +{{ POINTS_RULES.quizComplete }}。
      </p>
    </StateView>
  </div>
</template>
