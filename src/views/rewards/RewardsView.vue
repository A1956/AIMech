<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Clock, Coin, Lock, Reading, Wallet } from '@element-plus/icons-vue'
import { fetchCases } from '@/api/case'
import PageHeader from '@/components/common/PageHeader.vue'
import StateView from '@/components/common/StateView.vue'
import { usePoints } from '@/composables/usePoints'
import {
  INVENTORY_LABELS,
  LOCKED_DIFFICULTIES,
  POINTS_RULES,
  POINT_ORDER_STATUS_LABELS,
  PURCHASE_PACKAGES,
} from '@/types/points'
import { formatDate } from '@/utils/format'
import { PAGE_TITLES } from '@/types/labels'

const {
  points,
  chatQuota,
  inventory,
  freeLeftToday,
  redeem,
  refreshPoints,
  isCaseLocked,
  listOffers,
  listOrders,
  listPointLogs,
  createPurchase,
  preparePayment,
  expirePurchase,
  completePurchase,
} = usePoints()

const loading = ref(true)
const error = ref('')
const offers = ref([])
const cases = ref([])
const orders = ref([])
const pointLogs = ref([])
const redeeming = ref('')
const purchasing = ref('')
const paying = ref(false)
const selectedCaseId = ref(null)
const paymentDialog = ref(false)
const paymentOrder = ref(null)
const paymentRemainingSeconds = ref(0)
let paymentCountdown = null

const paymentQrModules = (() => {
  const size = 29
  const finders = [
    { x: 0, y: 0 },
    { x: size - 7, y: 0 },
    { x: 0, y: size - 7 },
  ]
  const modules = []

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const finder = finders.find(({ x: left, y: top }) =>
        x >= left && x < left + 7 && y >= top && y < top + 7,
      )
      if (finder) {
        const localX = x - finder.x
        const localY = y - finder.y
        if (
          localX === 0 || localX === 6 || localY === 0 || localY === 6 ||
          (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4)
        ) {
          modules.push({ x, y })
        }
        continue
      }

      const inFinderSeparator = finders.some(({ x: left, y: top }) =>
        x >= left - 1 && x <= left + 7 && y >= top - 1 && y <= top + 7,
      )
      if (inFinderSeparator) continue

      if ((x === 6 || y === 6) && (x + y) % 2 === 0) {
        modules.push({ x, y })
      } else if ((x * 37 + y * 17 + x * y * 13 + 3) % 17 < 8) {
        modules.push({ x, y })
      }
    }
  }
  return modules
})()

const lockedCases = computed(() =>
  cases.value.filter((item) => LOCKED_DIFFICULTIES.includes(item.difficulty) && isCaseLocked(item)),
)

const inventoryText = computed(() => {
  if (!inventory.value.length) return '暂无'
  const counts = new Map()
  inventory.value.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1))
  return [...counts.entries()]
    .map(([key, count]) => `${INVENTORY_LABELS[key] || key}${count > 1 ? `*${count}` : ''}`)
    .join('、')
})

const formatMoney = (cents) => `¥${(Number(cents || 0) / 100).toFixed(2)}`
const purchaseIcon = (item) => (item.kind === 'points' ? Coin : ChatDotRound)
const redemptionIcon = (offer) => {
  if (offer.kind === 'unlock_case') return Lock
  if (offer.kind === 'inventory') return Reading
  return ChatDotRound
}
const paymentCountdownLabel = computed(() => {
  const minutes = Math.floor(paymentRemainingSeconds.value / 60)
  const seconds = paymentRemainingSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const orderBalanceChange = (order) => {
  if (order.type === 'redemption') return `-${order.pointsCost} 积分`
  if (order.pointsDelta) return `+${order.pointsDelta} 积分`
  if (order.chatQuotaDelta) return `+${order.chatQuotaDelta} 次 AI 问答`
  return '—'
}

const refreshRecords = async () => {
  const [orderList, logList] = await Promise.all([listOrders(), listPointLogs()])
  orders.value = orderList
  pointLogs.value = logList
}

const stopPaymentCountdown = () => {
  if (paymentCountdown) {
    clearInterval(paymentCountdown)
    paymentCountdown = null
  }
}

const expireCurrentOrder = async (orderId) => {
  try {
    const order = await expirePurchase(orderId)
    paymentOrder.value = order
    await refreshRecords()
    if (order.status === 'expired') {
      ElMessage.warning('订单已过期，余额未变更')
    }
  } catch (err) {
    ElMessage.error(err.userMessage || err.message || '更新订单状态失败')
  }
}

const updatePaymentCountdown = () => {
  if (!paymentOrder.value?.expiresAt) return
  const remaining = Math.max(0, Date.parse(paymentOrder.value.expiresAt) - Date.now())
  paymentRemainingSeconds.value = Math.ceil(remaining / 1000)
  if (paymentRemainingSeconds.value === 0) {
    stopPaymentCountdown()
    if (!paying.value && paymentOrder.value.status === 'pending') {
      expireCurrentOrder(paymentOrder.value.id)
    }
  }
}

const startPaymentCountdown = (order) => {
  stopPaymentCountdown()
  paymentRemainingSeconds.value = 0
  if (!['pending', 'processing'].includes(order.status) || !order.expiresAt) return
  updatePaymentCountdown()
  if (paymentRemainingSeconds.value > 0) {
    paymentCountdown = setInterval(updatePaymentCountdown, 1000)
  }
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    await refreshPoints()
    const [offerList, caseRes] = await Promise.all([listOffers(), fetchCases()])
    offers.value = offerList
    cases.value = caseRes.list
    await refreshRecords()
    if (!selectedCaseId.value && lockedCases.value.length) {
      selectedCaseId.value = lockedCases.value[0].id
    }
  } catch (err) {
    error.value = err.userMessage || '积分商城加载失败'
  } finally {
    loading.value = false
  }
}

const onPurchase = async (item) => {
  if (purchasing.value) return
  purchasing.value = item.id
  try {
    const requestId = `store-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const order = await createPurchase(item.id, requestId)
    paymentOrder.value = await preparePayment(order.id)
    await refreshRecords()
    if (paymentOrder.value.status === 'pending') {
      paymentDialog.value = true
      startPaymentCountdown(paymentOrder.value)
    } else {
      ElMessage.warning('订单已过期，余额未变更')
    }
  } catch (err) {
    ElMessage.error(err.userMessage || err.message || '创建订单失败')
  } finally {
    purchasing.value = ''
  }
}

const openPayment = async (order) => {
  if (!['pending', 'processing'].includes(order.status)) return
  try {
    paymentOrder.value = await preparePayment(order.id)
    await refreshRecords()
    if (!['pending', 'processing'].includes(paymentOrder.value.status)) {
      ElMessage.warning('订单已过期，余额未变更')
      return
    }
    paymentDialog.value = true
    startPaymentCountdown(paymentOrder.value)
  } catch (err) {
    ElMessage.error(err.userMessage || err.message || '打开订单失败')
  }
}

const onConfirmPayment = async () => {
  if (!paymentOrder.value || paying.value) return
  paying.value = true
  try {
    const { order } = await completePurchase(paymentOrder.value.id)
    paymentOrder.value = order
    await refreshRecords()
    paymentDialog.value = false
    ElMessage.success(`体验订单已完成，${orderBalanceChange(order)} 已到账`)
  } catch (err) {
    ElMessage.error(err.userMessage || err.message || '订单处理失败')
    try {
      paymentOrder.value = await preparePayment(paymentOrder.value.id)
      await refreshRecords()
      if (paymentOrder.value.status === 'expired') stopPaymentCountdown()
    } catch (refreshError) {
      ElMessage.error(refreshError.userMessage || refreshError.message || '刷新订单状态失败')
    }
  } finally {
    paying.value = false
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
      payload.requestId = `redeem-${offer.id}-${selectedCaseId.value}-${Date.now()}`
    } else {
      payload.requestId = `redeem-${offer.id}-${Date.now()}`
    }
    const updated = await redeem(payload)
    if (updated) {
      const caseRes = await fetchCases()
      cases.value = caseRes.list
      if (lockedCases.value.length) selectedCaseId.value = lockedCases.value[0].id
      else selectedCaseId.value = null
      await refreshRecords()
    }
  } finally {
    redeeming.value = ''
  }
}

onMounted(load)
onBeforeUnmount(stopPaymentCountdown)
</script>

<template>
  <div>
    <PageHeader
      :title="PAGE_TITLES.rewards"
      subtitle="积分与 AI 问答服务套餐，完成订单后即时到账；也可继续使用积分兑换学习服务。"
    />

    <StateView :loading="loading" :error="error" @retry="load">
      <template #loading>
        <div class="bio-card p-6"><el-skeleton animated :rows="8" /></div>
      </template>

      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="bio-card can-lift flex items-center gap-4 p-4">
          <div class="store-stat-icon store-stat-points">
            <el-icon :size="22"><Coin /></el-icon>
          </div>
          <div>
            <p class="text-xs text-mist">当前积分</p>
            <p class="mt-1 text-2xl font-semibold text-sand">{{ points }}</p>
          </div>
        </div>
        <div class="bio-card can-lift flex items-center gap-4 p-4">
          <div class="store-stat-icon store-stat-chat">
            <el-icon :size="22"><ChatDotRound /></el-icon>
          </div>
          <div>
            <p class="text-xs text-mist">AI 问答余量</p>
            <p class="mt-1 text-2xl font-semibold">{{ chatQuota }}</p>
            <p class="mt-1 text-xs text-mist">今日免费剩余 {{ freeLeftToday }} / {{ POINTS_RULES.dailyFreeChat }}</p>
          </div>
        </div>
        <div class="bio-card can-lift flex items-center gap-4 p-4">
          <div class="store-stat-icon store-stat-items">
            <el-icon :size="22"><Reading /></el-icon>
          </div>
          <div class="min-w-0">
            <p class="text-xs text-mist">学习道具</p>
            <p class="mt-1 truncate text-sm">{{ inventoryText }}</p>
          </div>
        </div>
      </section>

      <section class="mt-8">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="store-section-icon">
              <el-icon :size="20"><Wallet /></el-icon>
            </div>
            <div>
              <h2 class="text-lg font-semibold">积分充值与问答套餐</h2>
              <p class="mt-1 text-xs text-mist">本页面不连接真实收款；点击确认后仅在本地更新账户权益。</p>
            </div>
          </div>
        </div>
        <div class="store-product-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="item in PURCHASE_PACKAGES"
            :key="item.id"
            class="bio-card store-product-card can-lift relative flex flex-col p-5"
            :class="item.kind === 'points' ? 'store-product-points' : 'store-product-chat'"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="store-product-icon">
                <el-icon :size="23"><component :is="purchaseIcon(item)" /></el-icon>
              </div>
              <span class="store-product-type">
                {{ item.kind === 'points' ? '积分充值' : 'AI 服务' }}
              </span>
            </div>
            <h3 class="mt-4 text-base font-semibold">{{ item.title }}</h3>
            <p class="mt-2 min-h-12 flex-1 text-sm leading-6 text-mist">{{ item.desc }}</p>
            <div class="mt-4 flex items-baseline gap-1">
              <span class="text-2xl font-bold text-sand">{{ formatMoney(item.priceCents) }}</span>
              <span v-if="item.id === 'points_550'" class="store-bonus-badge">加赠 50</span>
            </div>
            <el-button
              class="mt-4 w-full"
              type="primary"
              :loading="purchasing === item.id"
              :disabled="Boolean(purchasing)"
              @click="onPurchase(item)"
            >
              立即购买
            </el-button>
          </article>
        </div>
      </section>

      <section class="mt-8">
        <div class="mb-4 flex items-center gap-3">
          <div class="store-section-icon store-section-icon-redeem">
            <el-icon :size="20"><Reading /></el-icon>
          </div>
          <h2 class="text-lg font-semibold">使用积分兑换服务</h2>
        </div>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="offer in offers"
            :key="offer.id"
            class="bio-card store-redeem-card can-lift flex flex-col p-5"
          >
            <div class="flex items-center gap-3">
              <div class="store-redeem-icon">
                <el-icon :size="20"><component :is="redemptionIcon(offer)" /></el-icon>
              </div>
              <h3 class="font-semibold">{{ offer.title }}</h3>
            </div>
            <p class="mt-3 flex-1 text-sm leading-6 text-mist">{{ offer.desc }}</p>
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
              :disabled="points < offer.cost || (offer.kind === 'unlock_case' && !selectedCaseId)"
              :loading="redeeming === offer.id"
              type="warning"
              @click="onRedeem(offer)"
            >
              立即兑换
            </el-button>
          </article>
        </div>
      </section>

      <section class="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 class="mb-3 text-lg font-semibold">订单记录</h2>
          <div v-if="!orders.length" class="bio-card p-4 text-sm text-mist">暂无订单</div>
          <div v-else class="space-y-3">
            <article v-for="order in orders" :key="order.id" class="bio-card flex items-start justify-between gap-3 p-4">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ order.title }}</p>
                <p class="mt-1 text-xs text-mist">
                  {{ formatDate(order.createdAt) }} · {{ orderBalanceChange(order) }}
                  <template v-if="order.amountCents"> · {{ formatMoney(order.amountCents) }}</template>
                </p>
              </div>
              <div class="shrink-0 text-right">
                <el-tag size="small" :type="order.status === 'failed' || order.status === 'expired' ? 'danger' : order.status === 'paid' || order.status === 'experience_completed' || order.status === 'completed' ? 'success' : 'warning'">
                  {{ POINT_ORDER_STATUS_LABELS[order.status] || order.status }}
                </el-tag>
                <el-button
                  v-if="order.status === 'pending' || order.status === 'processing'"
                  class="mt-1"
                  link
                  type="primary"
                  @click="openPayment(order)"
                >
                  继续支付
                </el-button>
              </div>
            </article>
          </div>
        </div>

        <div>
          <h2 class="mb-3 text-lg font-semibold">积分流水</h2>
          <div v-if="!pointLogs.length" class="bio-card p-4 text-sm text-mist">暂无积分流水</div>
          <div v-else class="space-y-3">
            <article v-for="log in pointLogs.slice(0, 12)" :key="log.id" class="bio-card flex items-center justify-between gap-3 p-4">
              <div class="min-w-0">
                <p class="truncate text-sm">{{ log.reason }}</p>
                <p class="mt-1 text-xs text-mist">{{ formatDate(log.createdAt) }}</p>
              </div>
              <span class="shrink-0 font-semibold" :class="log.amount >= 0 ? 'text-teal' : 'text-sand'">
                {{ log.amount > 0 ? '+' : '' }}{{ log.amount }}
              </span>
            </article>
          </div>
        </div>
      </section>

      <p class="mt-6 text-xs text-mist">
        规则提示：每日领积分 +{{ POINTS_RULES.dailyClaim }}；完成路径节点 +{{ POINTS_RULES.pathComplete }}；完成自测 +{{ POINTS_RULES.quizComplete }}。
      </p>
    </StateView>

    <el-dialog
      v-model="paymentDialog"
      title="付款码体验"
      width="min(420px, 92vw)"
      :close-on-click-modal="!paying"
      @closed="stopPaymentCountdown"
    >
      <template v-if="paymentOrder">
        <div class="text-center">
          <p class="text-sm">{{ paymentOrder.title }}</p>
          <p class="mt-2 text-2xl font-semibold text-sand">{{ formatMoney(paymentOrder.amountCents) }}</p>
          <div
            class="mx-auto mt-4 flex h-48 w-48 items-center justify-center rounded-xl bg-white p-3"
            role="img"
            aria-label="付款码展示图，不具备真实收款功能"
          >
            <svg viewBox="0 0 29 29" class="h-full w-full" aria-hidden="true">
              <rect width="29" height="29" fill="white" />
              <rect
                v-for="module in paymentQrModules"
                :key="`${module.x}-${module.y}`"
                :x="module.x"
                :y="module.y"
                width="1"
                height="1"
                fill="#142321"
              />
            </svg>
          </div>
          <p class="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal">
            <el-icon><Clock /></el-icon>
            付款码有效时间 · {{ paymentCountdownLabel }}
          </p>
          <p class="mt-2 text-xs leading-5 text-mist">
            当前版本未接入微信收款；点击确认只会更新本地账户权益，不会产生真实扣款。
          </p>
          <p v-if="paymentOrder.status === 'expired'" class="mt-2 text-sm text-red-400">
            订单已过期，余额未变更。
          </p>
        </div>
      </template>

      <template #footer>
        <el-button :disabled="paying" @click="paymentDialog = false">稍后处理</el-button>
        <el-button
          type="primary"
          :loading="paying"
          :disabled="
            !['pending', 'processing'].includes(paymentOrder?.status) ||
            (paymentOrder?.status === 'pending' && paymentRemainingSeconds <= 0)
          "
          @click="onConfirmPayment"
        >
          {{ paymentOrder?.status === 'processing' ? '继续完成' : paymentOrder?.status === 'expired' ? '订单已过期' : '已完成支付' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.store-stat-icon,
.store-section-icon,
.store-product-icon,
.store-redeem-icon {
  display: grid;
  flex: none;
  place-items: center;
  border-radius: 14px;
}

.store-stat-icon {
  width: 48px;
  height: 48px;
}

.store-stat-points,
.store-section-icon {
  color: #0e7c86;
  background: linear-gradient(145deg, rgba(14, 124, 134, 0.18), rgba(31, 169, 122, 0.1));
}

.store-stat-chat {
  color: #4774d9;
  background: linear-gradient(145deg, rgba(71, 116, 217, 0.18), rgba(96, 165, 250, 0.1));
}

.store-stat-items {
  color: #9964cc;
  background: linear-gradient(145deg, rgba(153, 100, 204, 0.18), rgba(192, 132, 252, 0.1));
}

.store-section-icon {
  width: 40px;
  height: 40px;
}

.store-section-icon-redeem {
  color: #c97719;
  background: linear-gradient(145deg, rgba(217, 119, 6, 0.2), rgba(245, 158, 11, 0.1));
}

.store-product-card {
  isolation: isolate;
  overflow: hidden;
  animation: store-card-enter 0.45s ease both;
}

.store-product-card::before {
  position: absolute;
  z-index: -1;
  top: -46px;
  right: -42px;
  width: 142px;
  height: 142px;
  border-radius: 999px;
  content: '';
  opacity: 0.7;
  transition: transform 0.35s ease;
}

.store-product-points::before {
  background: radial-gradient(circle, rgba(14, 124, 134, 0.2), rgba(31, 169, 122, 0.02) 70%);
}

.store-product-chat::before {
  background: radial-gradient(circle, rgba(71, 116, 217, 0.2), rgba(96, 165, 250, 0.02) 70%);
}

.store-product-card:hover::before {
  transform: scale(1.25);
}

.store-product-card:nth-child(2) {
  animation-delay: 60ms;
}

.store-product-card:nth-child(3) {
  animation-delay: 120ms;
}

.store-product-card:nth-child(4) {
  animation-delay: 180ms;
}

.store-product-icon {
  width: 52px;
  height: 52px;
  color: #0e7c86;
  background: linear-gradient(145deg, rgba(14, 124, 134, 0.18), rgba(31, 169, 122, 0.12));
  transition: transform 0.25s ease;
}

.store-product-chat .store-product-icon {
  color: #4774d9;
  background: linear-gradient(145deg, rgba(71, 116, 217, 0.18), rgba(96, 165, 250, 0.12));
}

.store-product-card:hover .store-product-icon {
  transform: rotate(-7deg) scale(1.06);
}

.store-product-type {
  padding: 4px 10px;
  border: 1px solid rgba(14, 124, 134, 0.18);
  border-radius: 999px;
  color: #0e7c86;
  background: rgba(14, 124, 134, 0.08);
  font-size: 0.72rem;
}

.store-product-chat .store-product-type {
  border-color: rgba(71, 116, 217, 0.2);
  color: #4774d9;
  background: rgba(71, 116, 217, 0.08);
}

.store-bonus-badge {
  padding: 2px 8px;
  border-radius: 999px;
  color: #a85b0a;
  background: rgba(245, 158, 11, 0.16);
  font-size: 0.7rem;
  font-weight: 600;
}

.store-redeem-card {
  border-color: rgba(217, 119, 6, 0.24);
  background:
    linear-gradient(145deg, rgba(245, 158, 11, 0.08), transparent 55%),
    var(--bio-panel);
  animation: store-card-enter 0.45s ease both;
}

.bio-card.store-redeem-card.can-lift:hover {
  border-color: rgba(217, 119, 6, 0.58);
  box-shadow: var(--bio-shadow), 0 0 0 1px rgba(245, 158, 11, 0.14);
}

.store-redeem-icon {
  width: 42px;
  height: 42px;
  color: #c97719;
  background: linear-gradient(145deg, rgba(217, 119, 6, 0.2), rgba(245, 158, 11, 0.1));
}

@keyframes store-card-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .store-product-card,
  .store-redeem-card,
  .store-product-icon,
  .store-product-card::before {
    animation: none;
    transition: none;
  }
}
</style>
