/** 全站命名（用户选定；路由 path 不变） */
export const PRODUCT_TAGLINE = '仿生机械设计AI助教平台'
export const PRODUCT_NAME = 'AIMech'

export const PAGE_TITLES = {
  login: '登录',
  home: '首页',
  tutor: 'AI助教',
  cases: '案例库',
  caseDetail: '案例详情',
  design: '智慧方案推荐',
  path: '智能学习路径',
  teacherPath: '智能教学路径',
  quiz: '答题智测',
  rewards: '积分商城',
  profile: '我的智慧档案',
  admin: '智能教学台',
  notFound: '页面不存在',
}

export const NAV_LABELS = {
  home: '首页',
  tutor: 'AI助教',
  tutorPreview: 'AI助教',
  cases: '案例库',
  quiz: '答题智测',
  design: '智慧方案',
  path: '智能学习路径',
  teacherPath: '智能教学路径',
  rewards: '积分商城',
  profile: '我的智慧档案',
  admin: '智能教学台',
  teacherCases: '案例智库',
}

export const ADMIN_TABS = {
  insights: '智能学情',
  cases: '案例管理',
  questions: '智能题库',
  papers: '智能组卷',
  users: '班级用户',
}

export const PATH_SUBTITLE = '上升圆弧学习路径：节点沿弧依次显现，完成状态同步到学档。'

export const SHORTCUT_COPY = {
  student: {
    tutor: { label: 'AI助教', desc: '机理 + 参数对照回答' },
    cases: { label: '案例库', desc: '8 类仿生结构方案' },
    quiz: { label: '答题智测', desc: '三科抽题练习与解析' },
    design: { label: '智慧方案', desc: '按约束输出 2–3 套方案' },
    path: { label: '智能学习路径', desc: '曲线阶段式课程地图' },
  },
  teacher: {
    insights: { label: '智能学情', desc: '高频问题 / 错题 / 课时' },
    questions: { label: '智能题库', desc: '机械设计·仿生学·机器人' },
    papers: { label: '智能组卷', desc: '按科目难度生成检测卷' },
    cases: { label: '案例智库', desc: '教师管理案例资源' },
  },
}
