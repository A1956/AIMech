import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { PAGE_TITLES, PRODUCT_NAME, PRODUCT_TAGLINE } from '@/types/labels'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { public: true, title: PAGE_TITLES.login },
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/home/HomeView.vue'), meta: { title: PAGE_TITLES.home } },
      { path: 'tutor', name: 'tutor', component: () => import('@/views/tutor/TutorView.vue'), meta: { title: PAGE_TITLES.tutor } },
      { path: 'cases', name: 'cases', component: () => import('@/views/cases/CaseListView.vue'), meta: { title: PAGE_TITLES.cases } },
      { path: 'cases/:id', name: 'case-detail', component: () => import('@/views/cases/CaseDetailView.vue'), meta: { title: PAGE_TITLES.caseDetail } },
      { path: 'design', name: 'design', component: () => import('@/views/design/DesignView.vue'), meta: { title: PAGE_TITLES.design } },
      { path: 'path', name: 'path', component: () => import('@/views/path/PathView.vue'), meta: { title: PAGE_TITLES.path } },
      {
        path: 'quiz',
        name: 'quiz',
        component: () => import('@/views/quiz/QuizView.vue'),
        meta: { title: PAGE_TITLES.quiz, role: 'student' },
      },
      {
        path: 'rewards',
        name: 'rewards',
        component: () => import('@/views/rewards/RewardsView.vue'),
        meta: { title: PAGE_TITLES.rewards, role: 'student' },
      },
      { path: 'profile', name: 'profile', component: () => import('@/views/profile/ProfileView.vue'), meta: { title: PAGE_TITLES.profile } },
      {
        path: 'admin',
        name: 'admin',
        component: () => import('@/views/admin/AdminView.vue'),
        meta: { title: PAGE_TITLES.admin, role: 'teacher' },
      },
      {
        path: '/404',
        name: 'not-found',
        component: () => import('@/views/error/NotFoundView.vue'),
        meta: { title: PAGE_TITLES.notFound },
      },
      { path: '/:pathMatch(.*)*', redirect: '/404' },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  const authed = Boolean(userStore.token && userStore.profile)
  const pageTitle =
    to.name === 'path' && userStore.profile?.role === 'teacher'
      ? PAGE_TITLES.teacherPath
      : to.meta.title || PRODUCT_NAME
  document.title = `${pageTitle} · ${PRODUCT_TAGLINE}`
  if (to.name === 'login' && authed) {
    return { path: userStore.profile?.role === 'teacher' ? '/admin' : '/' }
  }
  if (!to.meta.public && !authed) {
    return { path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }
  if (to.meta.role === 'teacher' && userStore.profile?.role !== 'teacher') {
    ElMessage.warning('智能教学台仅教师可访问')
    return { path: '/' }
  }
  if (to.meta.role === 'student' && userStore.profile?.role !== 'student') {
    ElMessage.warning('该功能面向学生；教师请使用智能教学台')
    return { path: '/admin' }
  }
  return true
})

export default router
