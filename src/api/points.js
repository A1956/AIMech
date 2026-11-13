import http from '@/api/http'
import { fetchUser, patchUser } from '@/api/user'
import { formatDay } from '@/utils/format'
import { POINTS_RULES, REDEEM_OFFERS, pickDailyLearningDrawPrize } from '@/types/points'

const nextLogId = () => Date.now() + Math.floor(Math.random() * 1000)

const writeLog = async ({ userId, type, amount, reason }) => {
  const payload = {
    id: nextLogId(),
    userId,
    type,
    amount,
    reason,
    createdAt: new Date().toISOString(),
  }
  const response = await http.post('/pointLogs', payload, { silent: true }).catch(() => null)
  return response?.data || payload
}

export const fetchOffers = async () => REDEEM_OFFERS

export const fetchPointLogs = async (userId) => {
  const response = await http.get('/pointLogs', {
    params: { userId, _sort: 'id', _order: 'desc' },
    silent: true,
  })
  return response.data || []
}

/** 同步用户积分相关字段 */
export const syncPointsProfile = async (userId) => {
  const user = await fetchUser(userId)
  return {
    points: Number(user.points || 0),
    lastClaimDate: user.lastClaimDate || null,
    chatQuota: Number(user.chatQuota || 0),
    unlockedCaseIds: [...(user.unlockedCaseIds || [])],
    inventory: [...(user.inventory || [])],
    chatFreeDate: user.chatFreeDate || null,
    chatFreeUsed: Number(user.chatFreeUsed || 0),
    dailyLearningDrawDate: user.dailyLearningDrawDate || null,
  }
}

/** 每日抽取学习道具；json-server 演示环境不支持并发事务 */
export const drawDailyLearningItem = async (userId, random = Math.random) => {
  const user = await fetchUser(userId)
  const today = formatDay(new Date())
  if (user.dailyLearningDrawDate === today) {
    const err = new Error('今日已抽取')
    err.userMessage = '今天已经抽过了，明天再来吧'
    throw err
  }

  const prize = pickDailyLearningDrawPrize(random())
  if (!prize) throw new Error('每日学习道具奖池概率配置无效')

  const inventory = [...(user.inventory || [])]
  if (prize.item) inventory.push(prize.item)
  const updated = await patchUser(userId, {
    dailyLearningDrawDate: today,
    inventory,
  })
  return { user: updated, prize }
}

/** 每日领积分 */
export const claimDailyPoints = async (userId) => {
  const user = await fetchUser(userId)
  const today = formatDay(new Date())
  if (user.lastClaimDate === today) {
    const err = new Error('今日已领取')
    err.userMessage = '今日已领取积分'
    throw err
  }
  const amount = POINTS_RULES.dailyClaim
  const next = {
    points: Number(user.points || 0) + amount,
    lastClaimDate: today,
  }
  const updated = await patchUser(userId, next)
  await writeLog({ userId, type: 'claim', amount, reason: '每日领积分' })
  return updated
}

/** 行为加分（路径 / 自测） */
export const earnPoints = async (userId, { amount, reason }) => {
  const user = await fetchUser(userId)
  const add = Number(amount || 0)
  if (add <= 0) return user
  const updated = await patchUser(userId, {
    points: Number(user.points || 0) + add,
  })
  await writeLog({ userId, type: 'earn', amount: add, reason })
  return updated
}

/**
 * 兑换权益
 * @param {number} userId
 * @param {{ offerId: string, caseId?: number }} options
 */
export const redeemOffer = async (userId, { offerId, caseId } = {}) => {
  const offer = REDEEM_OFFERS.find((item) => item.id === offerId)
  if (!offer) {
    const err = new Error('兑换项不存在')
    err.userMessage = '兑换项不存在'
    throw err
  }
  const user = await fetchUser(userId)
  const points = Number(user.points || 0)
  if (points < offer.cost) {
    const err = new Error('积分不足')
    err.userMessage = `积分不足，还需 ${offer.cost - points} 分`
    throw err
  }

  const patch = { points: points - offer.cost }
  if (offer.kind === 'chat_pack') {
    patch.chatQuota = Number(user.chatQuota || 0) + Number(offer.payload.amount || 0)
  } else if (offer.kind === 'inventory') {
    patch.inventory = [...(user.inventory || []), offer.payload.item]
  } else if (offer.kind === 'unlock_case') {
    const id = Number(caseId)
    if (!id) {
      const err = new Error('请选择要解锁的案例')
      err.userMessage = '请选择要解锁的案例'
      throw err
    }
    const unlocked = new Set(user.unlockedCaseIds || [])
    if (unlocked.has(id)) {
      const err = new Error('该案例已解锁')
      err.userMessage = '该案例已解锁'
      throw err
    }
    unlocked.add(id)
    patch.unlockedCaseIds = [...unlocked]
  }

  const updated = await patchUser(userId, patch)
  await writeLog({
    userId,
    type: 'spend',
    amount: -offer.cost,
    reason: `兑换：${offer.title}${caseId ? ` #${caseId}` : ''}`,
  })
  return updated
}

/**
 * 消耗一次问答额度：优先每日免费，再扣 chatQuota
 * @returns {{ ok: boolean, reason?: string, user?: object }}
 */
export const consumeChatQuota = async (userId) => {
  const user = await fetchUser(userId)
  const today = formatDay(new Date())
  let freeUsed = Number(user.chatFreeUsed || 0)
  let freeDate = user.chatFreeDate || null
  if (freeDate !== today) {
    freeDate = today
    freeUsed = 0
  }

  if (freeUsed < POINTS_RULES.dailyFreeChat) {
    const updated = await patchUser(userId, {
      chatFreeDate: freeDate,
      chatFreeUsed: freeUsed + 1,
    })
    return { ok: true, user: updated, source: 'free' }
  }

  const quota = Number(user.chatQuota || 0)
  if (quota > 0) {
    const updated = await patchUser(userId, {
      chatFreeDate: freeDate,
      chatFreeUsed: freeUsed,
      chatQuota: quota - 1,
    })
    return { ok: true, user: updated, source: 'quota' }
  }

  return {
    ok: false,
    reason: '今日免费问答已用完，请前往积分兑换获取问答次数',
    user,
  }
}
