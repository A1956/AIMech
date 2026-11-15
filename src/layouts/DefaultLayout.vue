<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Coin, Fold, Expand, Moon, Sunny } from '@element-plus/icons-vue'
import BrandLogo from '@/components/common/BrandLogo.vue'
import SmartIcon from '@/components/common/SmartIcon.vue'
import ThemeFab from '@/components/common/ThemeFab.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { useAuth } from '@/composables/useAuth'
import { usePermission } from '@/composables/usePermission'
import { usePoints } from '@/composables/usePoints'
import { useTheme } from '@/composables/useTheme'
import { NAV_LABELS, PRODUCT_NAME, PRODUCT_TAGLINE } from '@/types/labels'
import { peerName } from '@/utils/format'

const SIDEBAR_KEY = 'bio-sidebar'
const route = useRoute()
const router = useRouter()
const { profile, logout } = useAuth()
const { isTeacher, isStudent } = usePermission()
const { isDark, toggleTheme } = useTheme()
const { levelLabel, points, refreshPoints } = usePoints()

const drawer = ref(false)
const userCollapsed = ref(localStorage.getItem(SIDEBAR_KEY) === '1')
/** AI 助教页默认收起；用户可临时展开（仅教师侧栏） */
const tutorPinnedOpen = ref(false)
const forceCollapse = computed(() => route.path.startsWith('/tutor') && !tutorPinnedOpen.value)
const sidebarCollapsed = computed(() => forceCollapse.value || (!route.path.startsWith('/tutor') && userCollapsed.value))

const navItems = computed(() => {
  if (isTeacher.value) {
    return [
      { to: '/admin?tab=insights', label: NAV_LABELS.admin, icon: 'admin' },
      { to: '/', label: NAV_LABELS.home, icon: 'home' },
      { to: '/cases', label: NAV_LABELS.teacherCases, icon: 'cases' },
      { to: '/tutor', label: 'AI助教', icon: 'tutor' },
      { to: '/design', label: NAV_LABELS.design, icon: 'design' },
      { to: '/path', label: NAV_LABELS.teacherPath, icon: 'path' },
      { to: '/profile', label: NAV_LABELS.profile, icon: 'profile' },
    ]
  }
  // 积分商城与智慧档案由主导航和头像点击菜单访问
  return [
    { to: '/', label: NAV_LABELS.home, icon: 'home' },
    { to: '/tutor', label: 'AI助教', icon: 'tutor' },
    { to: '/cases', label: NAV_LABELS.cases, icon: 'cases' },
    { to: '/quiz', label: NAV_LABELS.quiz, icon: 'quiz' },
    { to: '/design', label: NAV_LABELS.design, icon: 'design' },
    { to: '/path', label: NAV_LABELS.path, icon: 'path' },
  ]
})

const headerDisplayName = computed(() =>
  isStudent.value ? peerName(profile.value?.name) : profile.value?.name || '',
)

const onAvatarCommand = async (cmd) => {
  if (cmd === 'rewards') await go('/rewards')
  if (cmd === 'profile') await go('/profile')
}

const pathOnly = (to) => String(to || '').split('?')[0]

const isNavActive = (to) => {
  const path = pathOnly(to)
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const closeDrawer = () => {
  drawer.value = false
}

const go = async (to) => {
  closeDrawer()
  if (route.fullPath !== to) await router.push(to)
}

const toggleSidebar = () => {
  if (route.path.startsWith('/tutor')) {
    tutorPinnedOpen.value = !tutorPinnedOpen.value
    return
  }
  userCollapsed.value = !userCollapsed.value
  localStorage.setItem(SIDEBAR_KEY, userCollapsed.value ? '1' : '0')
}

watch(
  () => route.path,
  (path, prev) => {
    if (path.startsWith('/tutor')) {
      tutorPinnedOpen.value = false
    } else if (prev?.startsWith('/tutor')) {
      tutorPinnedOpen.value = false
    }
  },
)

onMounted(() => {
  if (isStudent.value) refreshPoints()
})
</script>

<template>
  <div class="flex min-h-screen flex-col text-paper" :class="{ 'student-shell': isStudent }">
    <!-- 教师：原顶栏；学生：顶栏含水平导航 + 积分 -->
    <header class="sticky top-0 z-30 border-b border-[color:var(--bio-line)] bg-panel/95 backdrop-blur">
      <div
        class="mx-auto flex max-w-[1440px] items-center gap-3 px-3 md:px-5"
        :class="isStudent ? 'h-14' : 'h-14 justify-between'"
      >
        <div class="flex min-w-0 shrink-0 items-center gap-2.5">
          <template v-if="isTeacher">
            <button
              type="button"
              class="nav-link !hidden !p-2 lg:!inline-flex"
              :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
              @click="toggleSidebar"
            >
              <el-icon :size="18"><component :is="sidebarCollapsed ? Expand : Fold" /></el-icon>
            </button>
          </template>
          <button
            type="button"
            class="nav-link !p-2"
            :class="isStudent ? 'lg:!hidden' : 'lg:!hidden'"
            aria-label="打开菜单"
            @click="drawer = true"
          >
            <el-icon :size="20"><Expand /></el-icon>
          </button>
          <BrandLogo size="xl" />
          <div class="min-w-0 leading-none">
            <p class="m-0 truncate text-sm font-semibold leading-[1.15] tracking-wide md:text-[0.95rem]">{{ PRODUCT_NAME }}</p>
            <p class="m-0 mt-0.5 hidden truncate text-xs leading-none text-mist sm:block">{{ PRODUCT_TAGLINE }}</p>
          </div>
        </div>

        <!-- 学生桌面：水平导航（溢出横向滚动） -->
        <nav
          v-if="isStudent"
          class="student-top-nav ml-2 hidden min-w-0 flex-1 items-center lg:flex"
          aria-label="学生导航"
        >
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="student-nav-item"
            :class="{ active: isNavActive(item.to) }"
          >
            <SmartIcon :name="item.icon" :size="20" />
            <span>{{ item.label }}</span>
          </router-link>
        </nav>

        <div
          v-if="isStudent"
          class="hidden shrink-0 border-l border-[color:var(--bio-line)] pl-2 lg:block xl:pl-3"
        >
          <router-link
            to="/rewards"
            class="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-mist transition-colors hover:bg-teal/10 hover:text-teal xl:gap-2 xl:px-3"
            :class="{ 'bg-teal/10 text-teal': route.path.startsWith('/rewards') }"
            :aria-label="`${NAV_LABELS.rewards}，当前${points}积分`"
          >
            <el-icon :size="18"><Coin /></el-icon>
            <span>{{ NAV_LABELS.rewards }}</span>
            <span class="hidden rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal 2xl:inline-flex">
              {{ points }}
            </span>
          </router-link>
        </div>

        <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <!-- 学生：等级 | 头像 | 姓名；点击头像可打开积分商城 / 智慧档案 -->
          <template v-if="isStudent">
            <el-dropdown trigger="click" placement="bottom-end" @command="onAvatarCommand">
              <button
                type="button"
                class="header-avatar-btn flex shrink-0 items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
                aria-label="个人菜单"
              >
                <span
                  class="hidden items-center rounded-full border border-[color:var(--bio-line)] bg-ink/40 px-2 py-0.5 text-xs font-semibold text-teal sm:inline-flex"
                  title="等级由积分换算"
                >
                  {{ levelLabel }}
                </span>
                <UserAvatar :avatar="profile?.avatar" :name="profile?.name" :student="isStudent" :size="40" />
                <span class="hidden max-w-[100px] truncate text-[0.9375rem] font-medium sm:inline">
                  {{ headerDisplayName }}
                </span>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="rewards">{{ NAV_LABELS.rewards }}</el-dropdown-item>
                  <el-dropdown-item command="profile">{{ NAV_LABELS.profile }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <div v-else class="flex items-center gap-2.5">
            <UserAvatar :avatar="profile?.avatar" :name="profile?.name" :size="36" />
            <div class="hidden leading-tight sm:block">
              <p class="max-w-[120px] truncate text-sm font-medium">{{ headerDisplayName }}</p>
              <span class="inline-flex rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                教师端
              </span>
            </div>
            <span class="inline-flex rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent sm:hidden">
              教师
            </span>
          </div>
          <!-- 教师保留顶栏主题；学生用浮标 -->
          <button
            v-if="isTeacher"
            type="button"
            class="theme-toggle flex items-center gap-1 text-sm"
            :aria-label="isDark ? '切换浅色' : '切换深色'"
            @click="toggleTheme"
          >
            <el-icon><component :is="isDark ? Sunny : Moon" /></el-icon>
            <span class="hidden md:inline">{{ isDark ? '浅色' : '深色' }}</span>
          </button>
          <el-button class="btn-logout" plain size="small" @click="logout">退出</el-button>
        </div>
      </div>
    </header>

    <div class="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1">
      <!-- 仅教师：可折叠侧栏 -->
      <aside
        v-if="isTeacher"
        class="sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-[color:var(--bio-line)] bg-panel/90 py-4 backdrop-blur transition-[width] duration-200 lg:flex"
        :class="sidebarCollapsed ? 'w-[68px] px-2' : 'w-60 px-3'"
      >
        <nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ active: isNavActive(item.to), '!justify-center !px-2': sidebarCollapsed }"
            :title="item.label"
          >
            <SmartIcon :name="item.icon" :size="18" />
            <span v-if="!sidebarCollapsed">{{ item.label }}</span>
          </router-link>
        </nav>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <main class="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 lg:px-8">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>
      </div>
    </div>

    <ThemeFab v-if="isStudent" />

    <el-drawer v-model="drawer" direction="ltr" size="78%" title="导航" class="bio-drawer">
      <nav class="flex flex-col gap-1">
        <button
          v-for="item in navItems"
          :key="item.to"
          type="button"
          class="nav-link w-full text-left"
          :class="{ active: isNavActive(item.to) }"
          @click="go(item.to)"
        >
          <SmartIcon :name="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <div v-if="isStudent" class="mt-4 border-t border-[color:var(--bio-line)] pt-4 text-sm">
        <button
          type="button"
          class="nav-link w-full justify-between"
          :class="{ active: route.path.startsWith('/rewards') }"
          @click="go('/rewards')"
        >
          <span class="flex items-center gap-2">
            <el-icon><Coin /></el-icon>
            <span>{{ NAV_LABELS.rewards }}</span>
          </span>
          <span class="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">
            {{ points }}
          </span>
        </button>
        <p class="text-mist">
          当前等级 <span class="font-semibold text-teal">{{ levelLabel }}</span>
        </p>
        <p class="mt-1 text-xs text-mist">每日领积分请到「智能学习路径」</p>
      </div>
    </el-drawer>
  </div>
</template>
