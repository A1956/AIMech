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
    title: '问答次数包',
    desc: '兑换后增加 5 次小智问答额度',
    cost: 30,
    kind: 'chat_pack',
    payload: { amount: 5 },
  },
  {
    id: 'unlock_case',
    title: '解锁进阶案例',
    desc: '解锁 1 个进阶/综合案例的完整内容',
    cost: 40,
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

/** 需要积分解锁的案例难度 */
export const LOCKED_DIFFICULTIES = ['进阶', '综合']
