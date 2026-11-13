/** 去掉密码后再写入登录态 */
export const stripUser = (user) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  role: user.role,
  avatar: user.avatar || '',
  progress: {
    completedCourseIds: [...(user.progress?.completedCourseIds || [])],
    studyLog: [...(user.progress?.studyLog || [])],
  },
  points: Number(user.points || 0),
  lastClaimDate: user.lastClaimDate || null,
  chatQuota: Number(user.chatQuota || 0),
  unlockedCaseIds: [...(user.unlockedCaseIds || [])],
  inventory: [...(user.inventory || [])],
  chatFreeDate: user.chatFreeDate || null,
  chatFreeUsed: Number(user.chatFreeUsed || 0),
  dailyLearningDrawDate: user.dailyLearningDrawDate || null,
})

const pad = (value) => String(value).padStart(2, '0')

export const formatDate = (iso) => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const formatDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const sumMinutes = (log = []) => log.reduce((sum, item) => sum + Number(item.minutes || 0), 0)

export const initials = (name) => Array.from(name || '学').slice(0, 1).join('')

/** 学生端默认称呼：姓 + 同学 */
export const peerName = (name) => {
  const surname = Array.from(name || '').slice(0, 1).join('')
  return surname ? `${surname}同学` : '同学'
}

export const difficultyTone = (difficulty) => {
  if (difficulty === '入门') return 'text-accent'
  if (difficulty === '综合') return 'text-sand'
  return 'text-teal'
}

/** 去掉空查询，避免 json-server 把空字符串当成过滤条件 */
export const compactParams = (raw) =>
  Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  )
