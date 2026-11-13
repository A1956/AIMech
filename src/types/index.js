/**
 * @typedef {'student' | 'teacher'} UserRole
 * @typedef {'view' | 'complete'} RecordType
 * @typedef {'user' | 'assistant'} MessageRole
 * @typedef {'入门' | '进阶' | '综合'} Difficulty
 */

/**
 * @typedef {Object} StudyPoint
 * @property {string} date
 * @property {number} minutes
 */

/**
 * @typedef {Object} UserProgress
 * @property {number[]} completedCourseIds
 * @property {StudyPoint[]} studyLog
 */

/**
 * @typedef {Object} UserProfile
 * @property {number} id
 * @property {string} username
 * @property {string} name
 * @property {UserRole} role
 * @property {string} avatar
 * @property {UserProgress} progress
 */

/**
 * @typedef {Object} CaseParam
 * @property {string} name
 * @property {string} symbol
 * @property {string} value
 * @property {string} unit
 * @property {string} note
 */

/**
 * @typedef {Object} BioCase
 * @property {number} id
 * @property {string} title
 * @property {string} bioPrototype
 * @property {string} principle
 * @property {string} structure
 * @property {CaseParam[]} params
 * @property {string[]} applications
 * @property {string[]} tags
 * @property {Difficulty} difficulty
 * @property {string} cover
 * @property {number} views
 * @property {number} likes
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Course
 * @property {number} id
 * @property {string} title
 * @property {string} stage
 * @property {number} order
 * @property {string} desc
 * @property {number[]} caseIds
 * @property {number} duration
 */

/**
 * @typedef {Object} Favorite
 * @property {number} id
 * @property {number} userId
 * @property {number} caseId
 * @property {string} createdAt
 */

/**
 * @typedef {Object} LearnRecord
 * @property {number} id
 * @property {number} userId
 * @property {number} caseId
 * @property {RecordType} type
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ChatMessage
 * @property {number} id
 * @property {number} conversationId
 * @property {MessageRole} role
 * @property {string} content
 * @property {number | null} refCaseId
 * @property {string} createdAt
 */

/**
 * @typedef {Object} TeachingVideo
 * @property {number} id
 * @property {string} title
 * @property {number} caseId
 * @property {string} knowledgePoint
 * @property {string} stage
 * @property {number} durationMin
 * @property {number} views
 * @property {string} createdAt
 */

/**
 * 案例视频（观察片段，与 mock 的 TeachingVideo 微课表无关）
 * @typedef {Object} CaseShortVideo
 * @property {number} caseId
 * @property {string} slug 文件名标识，视频位于 /media/cases/{slug}.mp4
 * @property {string} title
 * @property {string} src MP4 地址
 * @property {string} poster 封面图
 * @property {number} duration 时长（秒）
 * @property {number} width
 * @property {number} height
 * @property {string} format
 * @property {string} codec
 * @property {boolean} audio 是否含音轨
 * @property {Array<{ caption: string, author: string, sourceUrl: string }>} credits 画面来源
 * @property {{ name: string, url: string } | null} license 素材许可
 */

/**
 * @typedef {Object} QuestionStat
 * @property {number} id
 * @property {string} question
 * @property {string} topic
 * @property {number} caseId
 * @property {number} count
 * @property {string} lastAskedAt
 */

/**
 * @typedef {Object} KnowledgeWeakness
 * @property {number} id
 * @property {string} knowledgePoint
 * @property {string} stage
 * @property {number} courseId
 * @property {number} caseId
 * @property {number} weakRate
 * @property {string} wrongHint
 * @property {string} suggestion
 */

/**
 * @typedef {'机械设计' | '仿生学' | '机器人'} QuizSubject
 * @typedef {'single' | 'judge'} QuestionType
 * @typedef {'self' | 'assigned'} QuizMode
 */

/**
 * @typedef {Object} BankQuestion
 * @property {number} id
 * @property {QuizSubject} subject
 * @property {string} knowledgePoint
 * @property {Difficulty} difficulty
 * @property {QuestionType} type
 * @property {string} stem
 * @property {string[]} options
 * @property {string} answer
 * @property {string} analysis
 * @property {number | null} [caseId]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ExamPaper
 * @property {number} id
 * @property {string} title
 * @property {number} teacherId
 * @property {QuizSubject[]} subjects
 * @property {Difficulty | '混合'} difficulty
 * @property {number} count
 * @property {number[]} questionIds
 * @property {number} durationMin
 * @property {string} [deadline] ISO 截止作答时间
 * @property {number} [scoreTotal] 试卷总分
 * @property {string} [chapter] 章节 / 知识点
 * @property {QuestionType | '全部'} [questionType]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} QuizAnswerDetail
 * @property {number} questionId
 * @property {string} selected
 * @property {boolean} correct
 */

/**
 * @typedef {Object} QuizAttempt
 * @property {number} id
 * @property {number} userId
 * @property {number | null} paperId
 * @property {QuizMode} mode
 * @property {string} subject
 * @property {number} score
 * @property {number} total
 * @property {number} [correctCount]
 * @property {number} [questionCount]
 * @property {number[]} wrongQuestionIds
 * @property {QuizAnswerDetail[]} detail
 * @property {number} durationSec
 * @property {string} createdAt
 */

export const DIFFICULTIES = ['入门', '进阶', '综合']

export const QUIZ_SUBJECTS = ['机械设计', '仿生学', '机器人']

export const QUESTION_TYPES = [
  { value: 'single', label: '单选' },
  { value: 'judge', label: '判断' },
]

export const STAGE_ORDER = ['机理认知', '结构映射', '工程综合']

export const SORT_OPTIONS = [
  { value: 'createdAt', label: '最新收录' },
  { value: 'views', label: '最多浏览' },
  { value: 'likes', label: '最多收藏' },
]

export const ENVIRONMENTS = [
  { value: 'dry', label: '干燥清洁表面' },
  { value: 'wet', label: '潮湿或凝露' },
  { value: 'underwater', label: '水下 / 高湿流体' },
  { value: 'vacuum', label: '真空或无胶洁净' },
  { value: 'dust', label: '粉尘、低能见度' },
  { value: 'highspeed', label: '高速气流或高速入水' },
  { value: 'narrow', label: '狭窄缝隙与管道' },
]

export const PRECISIONS = [
  { value: 'rough', label: '粗定位 ±1 mm' },
  { value: 'normal', label: '一般装配 ±0.1 mm' },
  { value: 'precision', label: '精密操作 ±0.01 mm' },
]

export const COVER_OPTIONS = [
  { src: '/covers/gecko.jpg', label: '壁虎干黏附' },
  { src: '/covers/honeycomb.jpg', label: '蜂巢夹层' },
  { src: '/covers/shark.jpg', label: '鲨鱼沟槽' },
  { src: '/covers/bone.jpg', label: '鸟骨桁架' },
  { src: '/covers/bat.jpg', label: '蝙蝠声呐' },
  { src: '/covers/lotus.jpg', label: '荷叶自清洁' },
  { src: '/covers/kingfisher.jpg', label: '翠鸟喙形' },
  { src: '/covers/snake.jpg', label: '蛇形运动' },
]

export const PRESET_TAGS = [
  '干黏附',
  '微纳结构',
  '爬壁机器人',
  '界面力学',
  '轻量化',
  '夹层结构',
  '比刚度',
  '航空航天',
  '减阻',
  '湍流',
  '表面织构',
  '流体',
  '点阵',
  '屈曲',
  '增材制造',
  '声呐',
  '感知',
  '定位',
  '仿生传感',
  '超疏水',
  '自清洁',
  '润湿',
  '减噪',
  '气动外形',
  '高速',
  '跨介质',
  '蛇形机器人',
  '运动学',
  '冗余驱动',
  '非结构化环境',
]

export const SUGGESTED_PROMPTS = [
  '壁虎足靠什么力黏附，剥离角为什么不能随便加大？',
  '同样要轻，蜂巢夹层和鸟骨中空梁怎么选？',
  '鲨鱼皮沟槽在什么条件下才会减阻？',
]
