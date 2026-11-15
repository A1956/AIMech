import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  claimDailyPoints,
  completePurchaseExperience,
  consumeChatQuota,
  createPurchaseOrder,
  drawDailyLearningItem,
  earnPoints,
  expirePurchaseOrder,
  fetchOffers,
  fetchPointLogs,
  fetchPointOrders,
  preparePurchasePayment,
  redeemOffer,
  syncPointsProfile,
} from '@/api/points'
import { useAuth } from '@/composables/useAuth'
import { useUserStore } from '@/stores/user'
import { formatDay } from '@/utils/format'
import { LOCKED_DIFFICULTIES, POINTS_RULES, calcLevel, formatLevel } from '@/types/points'

/** 学生积分领取 / 兑换 / 问答额度 */
export const usePoints = () => {
  const { profile, isTeacher } = useAuth()
  const userStore = useUserStore()

  const points = computed(() => Number(profile.value?.points || 0))
  const level = computed(() => calcLevel(points.value))
  const levelLabel = computed(() => formatLevel(points.value))
  const chatQuota = computed(() => Number(profile.value?.chatQuota || 0))
  const unlockedCaseIds = computed(() => profile.value?.unlockedCaseIds || [])
  const inventory = computed(() => profile.value?.inventory || [])
  const claimedToday = computed(() => profile.value?.lastClaimDate === formatDay(new Date()))
  const drewLearningItemToday = computed(
    () => profile.value?.dailyLearningDrawDate === formatDay(new Date()),
  )

  const freeLeftToday = computed(() => {
    const today = formatDay(new Date())
    if (profile.value?.chatFreeDate !== today) return POINTS_RULES.dailyFreeChat
    return Math.max(0, POINTS_RULES.dailyFreeChat - Number(profile.value?.chatFreeUsed || 0))
  })

  const applyUser = (user) => {
    if (!user) return
    userStore.syncPoints(user)
  }

  const refreshPoints = async () => {
    if (!profile.value?.id || isTeacher.value) return null
    const data = await syncPointsProfile(profile.value.id)
    userStore.syncPoints(data)
    return data
  }

  const claim = async () => {
    if (!profile.value?.id) return
    if (claimedToday.value) {
      ElMessage.info('今日已领取')
      return null
    }
    try {
      const updated = await claimDailyPoints(profile.value.id)
      applyUser(updated)
      ElMessage.success(`领取成功，+${POINTS_RULES.dailyClaim} 积分`)
      return updated
    } catch (err) {
      ElMessage.warning(err.userMessage || '领取失败')
      return null
    }
  }

  const drawLearningItem = async () => {
    if (!profile.value?.id || isTeacher.value) return null
    try {
      const result = await drawDailyLearningItem(profile.value.id)
      applyUser(result.user)
      if (result.prize.item) ElMessage.success(`抽中了${result.prize.label}，已放入学习道具`)
      else ElMessage.info('今天没有抽中道具，明天再来试试')
      return result.prize
    } catch (err) {
      ElMessage.warning(err.userMessage || '抽取失败，请稍后重试')
      return null
    }
  }

  const redeem = async ({ offerId, caseId, requestId } = {}) => {
    if (!profile.value?.id) return null
    try {
      const updated = await redeemOffer(profile.value.id, { offerId, caseId, requestId })
      applyUser(updated)
      ElMessage.success('兑换成功')
      return updated
    } catch (err) {
      ElMessage.error(err.userMessage || '兑换失败')
      return null
    }
  }

  const earn = async ({ amount, reason }) => {
    if (!profile.value?.id || isTeacher.value) return null
    try {
      const updated = await earnPoints(profile.value.id, { amount, reason })
      applyUser(updated)
      return updated
    } catch {
      return null
    }
  }

  const tryConsumeChat = async () => {
    if (!profile.value?.id) return { ok: false, reason: '未登录' }
    if (isTeacher.value) return { ok: true, source: 'teacher' }
    const result = await consumeChatQuota(profile.value.id)
    if (result.user) applyUser(result.user)
    return result
  }

  const isCaseLocked = (caseItem) => {
    if (!caseItem || isTeacher.value) return false
    if (!LOCKED_DIFFICULTIES.includes(caseItem.difficulty)) return false
    return !unlockedCaseIds.value.includes(caseItem.id)
  }

  const listOffers = fetchOffers
  const listOrders = async () => {
    if (!profile.value?.id) return []
    return fetchPointOrders(profile.value.id)
  }
  const listPointLogs = async () => {
    if (!profile.value?.id) return []
    return fetchPointLogs(profile.value.id)
  }
  const createPurchase = async (packageId, requestId) => {
    if (!profile.value?.id) throw new Error('请先登录')
    return createPurchaseOrder(profile.value.id, packageId, requestId)
  }
  const preparePayment = async (orderId) => preparePurchasePayment(orderId)
  const expirePurchase = async (orderId) => expirePurchaseOrder(orderId)
  const completePurchase = async (orderId) => {
    const result = await completePurchaseExperience(orderId)
    applyUser(result.user)
    return result
  }

  return {
    points,
    level,
    levelLabel,
    chatQuota,
    unlockedCaseIds,
    inventory,
    claimedToday,
    drewLearningItemToday,
    freeLeftToday,
    claim,
    drawLearningItem,
    redeem,
    earn,
    refreshPoints,
    tryConsumeChat,
    isCaseLocked,
    listOffers,
    listOrders,
    listPointLogs,
    createPurchase,
    preparePayment,
    expirePurchase,
    completePurchase,
  }
}
