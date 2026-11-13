import fs from 'node:fs'

const path = new URL('../mock/db.json', import.meta.url)
const db = JSON.parse(fs.readFileSync(path, 'utf8'))

const extraStudents = [
  {
    id: 3,
    username: 'stu2',
    password: 'MechDemo!26A',
    name: '陈予安',
    role: 'student',
    avatar: '',
    progress: {
      completedCourseIds: [1],
      studyLog: [
        { date: '2026-11-07', minutes: 30 },
        { date: '2026-11-08', minutes: 20 },
        { date: '2026-11-10', minutes: 25 },
      ],
    },
  },
  {
    id: 4,
    username: 'stu3',
    password: 'MechDemo!26A',
    name: '赵景行',
    role: 'student',
    avatar: '',
    progress: {
      completedCourseIds: [1, 2, 3],
      studyLog: [
        { date: '2026-11-06', minutes: 40 },
        { date: '2026-11-08', minutes: 35 },
        { date: '2026-11-09', minutes: 28 },
        { date: '2026-11-10', minutes: 45 },
      ],
    },
  },
]

for (const stu of extraStudents) {
  if (!db.users.some((u) => u.id === stu.id)) db.users.push(stu)
}

db.videos = [
  {
    id: 1,
    title: '壁虎干黏附：剥离角与脱附开关',
    caseId: 1,
    knowledgePoint: '界面力与干黏附',
    stage: '机理认知',
    durationMin: 12,
    views: 286,
    createdAt: '2026-10-20T08:00:00.000Z',
  },
  {
    id: 2,
    title: '荷叶双尺度：Cassie 到 Wenzel 的失效',
    caseId: 6,
    knowledgePoint: '润湿与自清洁',
    stage: '机理认知',
    durationMin: 10,
    views: 241,
    createdAt: '2026-10-21T08:00:00.000Z',
  },
  {
    id: 3,
    title: '鲨鱼沟槽：s+ 选距与湍流边界层',
    caseId: 3,
    knowledgePoint: '湍流减阻',
    stage: '机理认知',
    durationMin: 14,
    views: 198,
    createdAt: '2026-10-22T08:00:00.000Z',
  },
  {
    id: 4,
    title: '蜂巢夹层：面板屈服与芯层剪切校核',
    caseId: 2,
    knowledgePoint: '夹层结构比刚度',
    stage: '结构映射',
    durationMin: 16,
    views: 167,
    createdAt: '2026-10-23T08:00:00.000Z',
  },
  {
    id: 5,
    title: '鸟骨中空梁：径厚比与局部屈曲',
    caseId: 4,
    knowledgePoint: '轻量化桁架',
    stage: '结构映射',
    durationMin: 13,
    views: 152,
    createdAt: '2026-10-24T08:00:00.000Z',
  },
  {
    id: 6,
    title: '翠鸟喙形：截面变化率与气动噪声',
    caseId: 7,
    knowledgePoint: '气动外形减噪',
    stage: '结构映射',
    durationMin: 11,
    views: 133,
    createdAt: '2026-10-25T08:00:00.000Z',
  },
  {
    id: 7,
    title: '蝙蝠调频声呐：带宽、基线与衰减',
    caseId: 5,
    knowledgePoint: '仿生感知定位',
    stage: '结构映射',
    durationMin: 15,
    views: 121,
    createdAt: '2026-10-26T08:00:00.000Z',
  },
  {
    id: 8,
    title: '蛇形机器人：Serpenoid 曲率波与摩擦各向异性',
    caseId: 8,
    knowledgePoint: '冗余运动链',
    stage: '工程综合',
    durationMin: 18,
    views: 109,
    createdAt: '2026-10-27T08:00:00.000Z',
  },
]

db.questionStats = [
  {
    id: 1,
    question: '潮湿表面还能不能用干黏附做主承载？',
    topic: '界面力与干黏附',
    caseId: 1,
    count: 42,
    lastAskedAt: '2026-11-10T16:20:00.000Z',
  },
  {
    id: 2,
    question: '剥离角为什么取 25°–30°，再大一点会怎样？',
    topic: '界面力与干黏附',
    caseId: 1,
    count: 37,
    lastAskedAt: '2026-11-11T02:10:00.000Z',
  },
  {
    id: 3,
    question: '鲨鱼皮沟槽的 s+ 怎么换算到实际肋间距？',
    topic: '湍流减阻',
    caseId: 3,
    count: 33,
    lastAskedAt: '2026-11-09T11:00:00.000Z',
  },
  {
    id: 4,
    question: '同样要轻，蜂巢夹层和鸟骨中空梁怎么选？',
    topic: '轻量化结构',
    caseId: 2,
    count: 29,
    lastAskedAt: '2026-11-10T08:40:00.000Z',
  },
  {
    id: 5,
    question: '只报接触角够不够证明自清洁？滚动角为什么重要？',
    topic: '润湿与自清洁',
    caseId: 6,
    count: 26,
    lastAskedAt: '2026-11-08T14:00:00.000Z',
  },
  {
    id: 6,
    question: '蛇形机器人关节数增加后控制带宽怎么处理？',
    topic: '冗余运动链',
    caseId: 8,
    count: 21,
    lastAskedAt: '2026-11-07T09:30:00.000Z',
  },
  {
    id: 7,
    question: '翠鸟喙减噪和高速列车头型是不是同一类截面变化问题？',
    topic: '气动外形减噪',
    caseId: 7,
    count: 18,
    lastAskedAt: '2026-11-06T18:00:00.000Z',
  },
  {
    id: 8,
    question: '蝙蝠声呐距离分辨率和带宽是什么关系？',
    topic: '仿生感知定位',
    caseId: 5,
    count: 15,
    lastAskedAt: '2026-11-05T12:00:00.000Z',
  },
]

db.knowledgeWeakness = [
  {
    id: 1,
    knowledgePoint: '湍流减阻 / s+ 选距',
    stage: '机理认知',
    courseId: 3,
    caseId: 3,
    weakRate: 0.72,
    wrongHint: '多数学生把沟槽当成“更光滑”，未建立无量纲间距',
    suggestion: '补做一次 s+ 换算练习，并对照视频 3',
  },
  {
    id: 2,
    knowledgePoint: '夹层结构失效模式',
    stage: '结构映射',
    courseId: 4,
    caseId: 2,
    weakRate: 0.65,
    wrongHint: '只谈比刚度，漏校核芯层剪切与面板皱曲',
    suggestion: '用同一载荷让学生分别校核面板 / 芯层 / 皱曲',
  },
  {
    id: 3,
    knowledgePoint: '轻量化与局部屈曲',
    stage: '结构映射',
    courseId: 4,
    caseId: 4,
    weakRate: 0.61,
    wrongHint: '径厚比过大时仍按屈服设计',
    suggestion: '要求写出屈曲临界与加劲方案',
  },
  {
    id: 4,
    knowledgePoint: '冗余运动链与摩擦各向异性',
    stage: '工程综合',
    courseId: 7,
    caseId: 8,
    weakRate: 0.58,
    wrongHint: '只调关节角，不给曲率波与摩擦比',
    suggestion: '节点 7 增加 Serpenoid 参数表作业',
  },
  {
    id: 5,
    knowledgePoint: '气动外形截面变化率',
    stage: '结构映射',
    courseId: 5,
    caseId: 7,
    weakRate: 0.47,
    wrongHint: '把减噪理解成表面吸声',
    suggestion: '对照列车微气压波案例讲解',
  },
]

const moreRecords = [
  { id: 11, userId: 3, caseId: 1, type: 'view', createdAt: '2026-11-07T02:00:00.000Z' },
  { id: 12, userId: 3, caseId: 1, type: 'complete', createdAt: '2026-11-07T02:30:00.000Z' },
  { id: 13, userId: 3, caseId: 3, type: 'view', createdAt: '2026-11-08T03:00:00.000Z' },
  { id: 14, userId: 4, caseId: 1, type: 'complete', createdAt: '2026-11-06T03:00:00.000Z' },
  { id: 15, userId: 4, caseId: 6, type: 'complete', createdAt: '2026-11-06T04:00:00.000Z' },
  { id: 16, userId: 4, caseId: 3, type: 'complete', createdAt: '2026-11-08T05:00:00.000Z' },
  { id: 17, userId: 4, caseId: 2, type: 'view', createdAt: '2026-11-09T05:00:00.000Z' },
  { id: 18, userId: 3, caseId: 8, type: 'view', createdAt: '2026-11-10T05:00:00.000Z' },
]

const maxRecordId = Math.max(0, ...db.records.map((r) => Number(r.id) || 0))
moreRecords.forEach((r, i) => {
  if (!db.records.some((x) => x.id === r.id)) {
    db.records.push({ ...r, id: Math.max(r.id, maxRecordId + i + 1) })
  }
})

fs.writeFileSync(path, `${JSON.stringify(db, null, 2)}\n`)
console.log(
  JSON.stringify(
    {
      users: db.users.length,
      videos: db.videos.length,
      questionStats: db.questionStats.length,
      knowledgeWeakness: db.knowledgeWeakness.length,
      records: db.records.length,
    },
    null,
    2,
  ),
)
