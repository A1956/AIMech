/** 积分规则与兑换目录（可调参） */
export const POINTS_RULES = {
  dailyClaim: 20,
  pathComplete: 10,
  quizComplete: 15,
  dailyFreeChat: 10,
}

/** 等级：每 pointsPerLevel 分升 1 级，展示如 L10级 */
export const LEVEL_RULES = {
  pointsPerLevel: 50,
  minLevel: 1,
  maxLevel: 99,
}

export const calcLevel = (pts) => {
  const raw = Math.floor(Number(pts || 0) / LEVEL_RULES.pointsPerLevel) + LEVEL_RULES.minLevel
  return Math.min(LEVEL_RULES.maxLevel, Math.max(LEVEL_RULES.minLevel, raw))
}

export const formatLevel = (pts) => `L${calcLevel(pts)}级`

export const INVENTORY_LABELS = {
  review_card: '复习卡',
  focus_card: '专注卡',
  hint_card: '提示卡',
}

export const DAILY_LEARNING_DRAW_PRIZES = [
  { item: 'review_card', label: INVENTORY_LABELS.review_card, probability: 35 },
  { item: 'focus_card', label: INVENTORY_LABELS.focus_card, probability: 25 },
  { item: 'hint_card', label: INVENTORY_LABELS.hint_card, probability: 20 },
  { item: null, label: '未中奖', probability: 20 },
]

export const pickDailyLearningDrawPrize = (randomValue = Math.random()) => {
  const roll = randomValue * 100
  let threshold = 0
  return DAILY_LEARNING_DRAW_PRIZES.find((prize) => {
    threshold += prize.probability
    return roll < threshold
  }) || null
}

/**
 * 静态兑换目录
 * @type {Array<{ id: string, title: string, desc: string, cost: number, kind: 'chat_pack'|'unlock_case'|'inventory', payload: Record<string, unknown> }>}
 */
export const REDEEM_OFFERS = [
  {
    id: 'chat_pack_5',
    title: 'AI 问答 1 次',
    desc: '兑换后增加 1 次小智问答额度',
    cost: 30,
    kind: 'chat_pack',
    payload: { amount: 1 },
  },
  {
    id: 'unlock_case',
    title: '解锁进阶案例',
    desc: '解锁 1 个进阶/综合案例的完整内容',
    cost: 100,
    kind: 'unlock_case',
    payload: {},
  },
  {
    id: 'review_card',
    title: '学习道具 · 复习卡',
    desc: '写入个人道具栏，便于复习重点机理',
    cost: 25,
    kind: 'inventory',
    payload: { item: 'review_card' },
  },
]

/** 商城购买套餐；金额以分存储 */
export const PURCHASE_PACKAGES = [
  {
    id: 'points_100',
    title: '100 积分',
    desc: '购买后立即到账',
    kind: 'points',
    points: 100,
    chatQuota: 0,
    priceCents: 600,
  },
  {
    id: 'points_550',
    title: '550 积分',
    desc: '含 50 积分赠送',
    kind: 'points',
    points: 550,
    chatQuota: 0,
    priceCents: 2500,
  },
  {
    id: 'chat_10',
    title: 'AI 问答 10 次',
    desc: '直接购买小智问答次数',
    kind: 'chat_quota',
    points: 0,
    chatQuota: 10,
    priceCents: 500,
  },
  {
    id: 'chat_30',
    title: 'AI 问答 30 次',
    desc: '适合集中学习与连续提问',
    kind: 'chat_quota',
    points: 0,
    chatQuota: 30,
    priceCents: 1200,
  },
]

export const PURCHASE_PAYMENT_TTL_MS = 5 * 60 * 1000

export const POINT_ORDER_STATUS_LABELS = {
  pending: '待确认支付',
  processing: '处理中',
  paid: '已完成',
  experience_completed: '体验已完成',
  failed: '支付失败',
  expired: '已过期',
  completed: '已兑换',
}

/** 需要积分解锁的案例难度 */
export const LOCKED_DIFFICULTIES = ['进阶', '综合']
