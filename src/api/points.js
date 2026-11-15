import http from '@/api/http'
import { fetchUser, patchUser } from '@/api/user'
import { formatDay } from '@/utils/format'
import {
  POINTS_RULES,
  PURCHASE_PAYMENT_TTL_MS,
  PURCHASE_PACKAGES,
  REDEEM_OFFERS,
  pickDailyLearningDrawPrize,
} from '@/types/points'

const nextLogId = () => Date.now() + Math.floor(Math.random() * 1000)
const nextOrderId = (prefix = 'order') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const inFlightOrders = new Set()
const orderError = (message) => Object.assign(new Error(message), { userMessage: message })

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

export const fetchPointOrders = async (userId) => {
  const response = await http.get('/pointOrders', {
    params: { userId, _sort: 'createdAt', _order: 'desc', _limit: 30 },
    silent: true,
  })
  return response.data || []
}

const findOrderByRequestId = async (userId, requestId) => {
  if (!requestId) return null
  const response = await http.get('/pointOrders', {
    params: { userId, requestId },
    silent: true,
  })
  return response.data?.[0] || null
}

const fetchPointOrder = async (orderId) => {
  const response = await http.get(`/pointOrders/${encodeURIComponent(orderId)}`, { silent: true })
  return response.data
}

const patchPointOrder = async (orderId, patch) => {
  const response = await http.patch(`/pointOrders/${encodeURIComponent(orderId)}`, patch, {
    silent: true,
  })
  return response.data
}

const ensureOrderPointLog = async (order, amount, reason) => {
  if (!amount) return
  const existing = await http.get('/pointLogs', {
    params: { userId: order.userId, orderId: order.id },
    silent: true,
  })
  if (existing.data?.length) return existing.data[0]
  const response = await http.post(
    '/pointLogs',
    {
      id: nextLogId(),
      userId: order.userId,
      orderId: order.id,
      type: amount < 0 ? 'spend' : 'purchase',
      amount,
      reason,
      createdAt: new Date().toISOString(),
    },
    { silent: true },
  )
  return response.data
}

const applyOrderToUser = async (order, user) => {
  const processedOrderIds = (user.processedPointOrderIds || []).map(String)
  if (processedOrderIds.includes(String(order.id))) return user

  const pointsDelta =
    order.type === 'redemption' ? -Number(order.pointsCost || 0) : Number(order.pointsDelta || 0)
  const points = Number(user.points || 0)
  if (points + pointsDelta < 0) {
    throw orderError(`积分不足，还需 ${Math.abs(pointsDelta) - points} 分`)
  }

  const patch = {
    points: points + pointsDelta,
    chatQuota: Number(user.chatQuota || 0) + Number(order.chatQuotaDelta || 0),
    processedPointOrderIds: [...processedOrderIds, String(order.id)].slice(-100),
  }

  if (order.offerKind === 'inventory') {
    patch.inventory = [...(user.inventory || []), order.inventoryItem]
  } else if (order.offerKind === 'unlock_case') {
    const caseId = Number(order.caseId)
    if (!caseId) throw orderError('请选择要解锁的案例')
    const unlocked = new Set(user.unlockedCaseIds || [])
    if (unlocked.has(caseId)) throw orderError('该案例已解锁')
    unlocked.add(caseId)
    patch.unlockedCaseIds = [...unlocked]
  }

  return patchUser(order.userId, patch)
}

export const createPurchaseOrder = async (userId, packageId, requestId = nextOrderId('request')) => {
  const product = PURCHASE_PACKAGES.find((item) => item.id === packageId)
  if (!product) throw orderError('商品不存在')

  const existing = await findOrderByRequestId(userId, requestId)
  if (existing) return existing

  const now = new Date().toISOString()
  const order = {
    id: nextOrderId('purchase'),
    requestId,
    userId,
    type: 'purchase',
    productId: product.id,
    title: product.title,
    amountCents: product.priceCents,
    pointsDelta: product.points,
    chatQuotaDelta: product.chatQuota,
    status: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: 'experience',
    createdAt: now,
    expiresAt: new Date(Date.now() + PURCHASE_PAYMENT_TTL_MS).toISOString(),
    updatedAt: now,
  }
  const response = await http.post('/pointOrders', order, { silent: true })
  return response.data
}

export const preparePurchasePayment = async (orderId) => {
  let order = await fetchPointOrder(orderId)
  if (!['pending', 'processing'].includes(order.status)) return order

  if (!order.expiresAt) {
    order = await patchPointOrder(order.id, {
      expiresAt: new Date(Date.now() + PURCHASE_PAYMENT_TTL_MS).toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  const expiresAt = Date.parse(order.expiresAt)
  if (!Number.isFinite(expiresAt)) throw orderError('订单有效期无效，请重新下单')
  if (order.status === 'pending' && Date.now() >= expiresAt) {
    order = await patchPointOrder(order.id, {
      status: 'expired',
      paymentStatus: 'expired',
      expiredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
  return order
}

export const expirePurchaseOrder = async (orderId) => {
  const order = await fetchPointOrder(orderId)
  if (order.status !== 'pending') return order
  const expiresAt = Date.parse(order.expiresAt)
  if (!Number.isFinite(expiresAt)) throw orderError('订单有效期无效')
  if (Date.now() < expiresAt) return order
  return patchPointOrder(order.id, {
    status: 'expired',
    paymentStatus: 'expired',
    expiredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export const completePurchaseExperience = async (orderId) => {
  if (inFlightOrders.has(orderId)) throw orderError('订单正在处理中，请勿重复提交')
  inFlightOrders.add(orderId)
  try {
    let order = await preparePurchasePayment(orderId)
    if (order.status === 'experience_completed' || order.status === 'paid') {
      return { order, user: await fetchUser(order.userId) }
    }
    if (order.status === 'expired') throw orderError('订单已过期，余额未变更')
    if (!['pending', 'processing'].includes(order.status)) {
      throw orderError('订单状态不允许完成')
    }

    if (order.status === 'pending' && Date.now() >= Date.parse(order.expiresAt)) {
      order = await patchPointOrder(order.id, {
        status: 'expired',
        paymentStatus: 'expired',
        expiredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      throw orderError('订单已过期，余额未变更')
    }

    if (order.status === 'pending') {
      order = await patchPointOrder(order.id, {
        status: 'processing',
        paymentStatus: 'experience_processing',
        updatedAt: new Date().toISOString(),
      })
    }
    const user = await fetchUser(order.userId)
    const updatedUser = await applyOrderToUser(order, user)
    await ensureOrderPointLog(
      order,
      Number(order.pointsDelta || 0),
      `体验购买：${order.title}`,
    )
    const completedOrder = await patchPointOrder(order.id, {
      status: 'experience_completed',
      paymentStatus: 'experience_completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return { order: completedOrder, user: updatedUser }
  } finally {
    inFlightOrders.delete(orderId)
  }
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

/** 每日抽取学习道具；本地数据服务不支持并发事务 */
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
 * @param {{ offerId: string, caseId?: number, requestId?: string }} options
 */
export const redeemOffer = async (
  userId,
  { offerId, caseId, requestId = nextOrderId('redeem-request') } = {},
) => {
  const offer = REDEEM_OFFERS.find((item) => item.id === offerId)
  if (!offer) throw orderError('兑换项不存在')

  let order = await findOrderByRequestId(userId, requestId)
  if (order && (order.productId !== offer.id || Number(order.caseId || 0) !== Number(caseId || 0))) {
    throw orderError('重复提交标识已用于其他订单')
  }
  if (order?.status === 'completed') return fetchUser(userId)
  if (order?.status === 'failed') throw orderError('该兑换订单已失败，请重新提交')

  if (!order) {
    const user = await fetchUser(userId)
    const points = Number(user.points || 0)
    if (points < offer.cost) {
      throw orderError(`积分不足，还需 ${offer.cost - points} 分`)
    }

    if (offer.kind === 'unlock_case') {
      const id = Number(caseId)
      if (!id) throw orderError('请选择要解锁的案例')
      if ((user.unlockedCaseIds || []).includes(id)) throw orderError('该案例已解锁')
    }

    const now = new Date().toISOString()
    const response = await http.post(
      '/pointOrders',
      {
        id: nextOrderId('redeem'),
        requestId,
        userId,
        type: 'redemption',
        productId: offer.id,
        title: offer.title,
        pointsCost: offer.cost,
        pointsDelta: -offer.cost,
        chatQuotaDelta: offer.kind === 'chat_pack' ? Number(offer.payload.amount || 0) : 0,
        offerKind: offer.kind,
        inventoryItem: offer.kind === 'inventory' ? offer.payload.item : null,
        caseId: caseId ? Number(caseId) : null,
        amountCents: 0,
        status: 'pending',
        paymentStatus: 'not_required',
        createdAt: now,
        updatedAt: now,
      },
      { silent: true },
    )
    order = response.data
  }

  if (inFlightOrders.has(order.id)) throw orderError('兑换订单正在处理中，请勿重复提交')
  inFlightOrders.add(order.id)
  try {
    if (order.status === 'pending') {
      order = await patchPointOrder(order.id, {
        status: 'processing',
        updatedAt: new Date().toISOString(),
      })
    } else if (order.status !== 'processing') {
      throw orderError('兑换订单状态无效')
    }

    const user = await fetchUser(userId)
    const updated = await applyOrderToUser(order, user)
    await ensureOrderPointLog(
      order,
      -Number(order.pointsCost),
      `兑换：${order.title}${order.caseId ? ` #${order.caseId}` : ''}`,
    )
    await patchPointOrder(order.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return updated
  } finally {
    inFlightOrders.delete(order.id)
  }
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
    reason: '今日免费问答已用完，请前往积分商城获取问答次数',
    user,
  }
}
