import { computed, onMounted, ref } from 'vue'

const STORAGE_KEY = 'bio-theme'
const theme = ref('light')

const applyDom = (mode) => {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(mode)
  root.style.colorScheme = mode === 'dark' ? 'dark' : 'light'
}

/** 浅色默认；深色可切换并持久化 */
export const useTheme = () => {
  const isDark = computed(() => theme.value === 'dark')
  const isLight = computed(() => theme.value === 'light')

  const setTheme = (mode) => {
    const next = mode === 'dark' ? 'dark' : 'light'
    theme.value = next
    localStorage.setItem(STORAGE_KEY, next)
    applyDom(next)
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  const initTheme = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    setTheme(saved === 'dark' ? 'dark' : 'light')
  }

  onMounted(() => {
    if (!document.documentElement.classList.contains('light') && !document.documentElement.classList.contains('dark')) {
      initTheme()
    }
  })

  return {
    theme,
    isDark,
    isLight,
    setTheme,
    toggleTheme,
    initTheme,
  }
}

/** 在应用启动时立刻应用，避免闪白/闪黑 */
export const bootstrapTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  const mode = saved === 'dark' ? 'dark' : 'light'
  theme.value = mode
  applyDom(mode)
}
