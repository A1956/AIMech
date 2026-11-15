<script setup>
import { nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Moon, Sunny } from '@element-plus/icons-vue'
import BrandLogo from '@/components/common/BrandLogo.vue'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/types/labels'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()
const { isDark, toggleTheme } = useTheme()

const loading = ref(false)
const isPlaying = ref(false)
const videoReady = ref(false)
const videoRef = ref(null)
const playbackController = ref(null)
const formRef = ref(null)
const form = reactive({
  username: 'stu',
  password: 'MechDemo!26A',
  role: 'student',
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const resolveHome = (role) => (role === 'teacher' ? '/admin' : '/')

const waitForVideoEnd = (video, signal) =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      signal.removeEventListener('abort', onAbort)
    }
    const onEnded = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('登录动画视频播放失败'))
    }
    const onAbort = () => {
      cleanup()
      resolve()
    }
    video.addEventListener('ended', onEnded, { once: true })
    video.addEventListener('error', onError, { once: true })
    signal.addEventListener('abort', onAbort, { once: true })
  })

const playLoginVideo = async (signal) => {
  await nextTick()
  const video = videoRef.value
  if (!video) throw new Error('登录动画视频未能加载')

  await Promise.all([video.play(), waitForVideoEnd(video, signal)])
}

const resetLoginAnimation = () => {
  playbackController.value?.abort()
  videoRef.value?.pause()
  isPlaying.value = false
  videoReady.value = false
}

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || loading.value) return
  const credentials = { ...form }
  loading.value = true
  isPlaying.value = true
  videoReady.value = false
  const controller = new AbortController()
  playbackController.value = controller
  try {
    const videoPlayback = playLoginVideo(controller.signal).then(
      () => null,
      (error) => error,
    )
    await login(credentials)
    const videoError = await videoPlayback
    if (videoError) {
      resetLoginAnimation()
      ElMessage.warning('登录动画无法播放，正在继续进入平台')
    }
    const queried = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    let redirect = queried || resolveHome(credentials.role)
    if (credentials.role === 'student' && redirect.startsWith('/admin')) redirect = '/'
    if (credentials.role === 'teacher' && !queried) redirect = '/admin'
    await router.replace(redirect || resolveHome(credentials.role))
  } catch (err) {
    resetLoginAnimation()
    ElMessage.error(err.message || err.userMessage || '登录失败')
  } finally {
    controller.abort()
    playbackController.value = null
    loading.value = false
  }
}

const fillDemo = (role) => {
  form.role = role
  form.username = role === 'teacher' ? 'teach' : 'stu'
  form.password = 'MechDemo!26A'
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
    <button
      type="button"
      class="theme-toggle absolute right-4 top-4 z-10 flex items-center gap-1 text-sm"
      @click="toggleTheme"
    >
      <el-icon><component :is="isDark ? Sunny : Moon" /></el-icon>
      {{ isDark ? '浅色' : '深色' }}
    </button>

    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-20 top-10 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
      <div class="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-sand/15 blur-3xl" />
    </div>

    <div class="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[color:var(--bio-line)] bg-panel/95 shadow-lift lg:grid-cols-2">
      <section class="hidden flex-col justify-between bg-ink/70 p-10 lg:flex">
        <div>
          <BrandLogo size="2xl" />
          <h1 class="mt-8 text-3xl font-bold tracking-wide text-paper">{{ PRODUCT_NAME }}</h1>
          <p class="mt-2 text-sm font-medium text-accent">{{ PRODUCT_TAGLINE }}</p>
          <p class="mt-3 max-w-md text-sm leading-7 text-mist">
            面向机械与机器人专业的仿生设计学习平台。用案例机理、参数表和智慧方案推荐，把生物灵感落到可校核的机械方案。
          </p>
          <div class="relative mt-8 h-44 w-full overflow-hidden rounded-2xl shadow-lift">
            <img
              src="/media/login-mec.jpg"
              alt="MEC 齿轮机构"
              class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-in-out"
              :class="videoReady ? 'opacity-0' : 'opacity-100'"
            />
            <video
              v-if="isPlaying"
              ref="videoRef"
              src="/media/login-chilun.mp4"
              muted
              playsinline
              preload="auto"
              aria-hidden="true"
              class="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 ease-in-out"
              :class="videoReady ? 'opacity-100' : 'opacity-0'"
              @canplay="videoReady = true"
            />
          </div>
        </div>
        <ul class="mt-6 space-y-3 text-sm text-mist">
          <li class="flex gap-2"><span class="text-accent">●</span> 学生端：案例库 / 小智 / 答题智测 / 智能学习路径</li>
          <li class="flex gap-2"><span class="text-accent">●</span> 教师端：智能学情 + 教学路径 + 案例管理 + 我的智慧档案</li>
          <li class="flex gap-2"><span class="text-accent">●</span> 当前仅本机运行，保留未来部署能力</li>
        </ul>
      </section>

      <section class="p-6 sm:p-10">
        <div class="mb-6 flex items-center gap-3 lg:hidden">
          <BrandLogo size="lg" />
          <div>
            <p class="font-semibold">{{ PRODUCT_NAME }}</p>
            <p class="text-xs text-mist">{{ PRODUCT_TAGLINE }}</p>
          </div>
        </div>
        <h2 class="text-xl font-semibold text-paper">按角色进入平台</h2>
        <p class="mt-1 text-sm text-mist">
          学生进入学习空间；教师进入智能教学台。
        </p>

        <el-form ref="formRef" class="mt-6" :model="form" :rules="rules" label-position="top" @submit.prevent>
          <el-form-item label="角色" prop="role">
            <el-radio-group v-model="form.role" class="w-full">
              <el-radio-button value="student">学生</el-radio-button>
              <el-radio-button value="teacher">教师</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="账号" prop="username">
            <el-input v-model="form.username" placeholder="stu / teach" autocomplete="username" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="MechDemo!26A"
              autocomplete="current-password"
              @keyup.enter="submit"
            />
          </el-form-item>
          <div class="mb-4 flex flex-wrap gap-2">
            <el-button size="small" plain @click="fillDemo('student')">填入学生账号</el-button>
            <el-button size="small" plain @click="fillDemo('teacher')">填入教师账号</el-button>
          </div>
          <el-button class="w-full btn-accent" type="primary" :loading="loading" @click="submit">
            进入平台
          </el-button>
        </el-form>
      </section>
    </div>
  </div>
</template>
