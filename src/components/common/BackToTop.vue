<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Top } from '@element-plus/icons-vue'

const props = defineProps({
  /** 滚动超过该距离后显示（px） */
  threshold: { type: Number, default: 280 },
})

const visible = ref(false)
/** @type {HTMLElement | Window | null} */
let scrollRoot = null

const getScrollTop = () => {
  if (!scrollRoot) return 0
  if (scrollRoot === window) return window.scrollY || document.documentElement.scrollTop || 0
  return /** @type {HTMLElement} */ (scrollRoot).scrollTop || 0
}

const onScroll = () => {
  visible.value = getScrollTop() >= props.threshold
}

const findScrollParent = () => {
  // 布局主内容区是滚动容器
  const main = document.querySelector('main.min-h-0.flex-1.overflow-y-auto')
  if (main) return main
  return window
}

const scrollToTop = () => {
  if (!scrollRoot) return
  if (scrollRoot === window) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  /** @type {HTMLElement} */ (scrollRoot).scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  scrollRoot = findScrollParent()
  scrollRoot.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  if (scrollRoot) scrollRoot.removeEventListener('scroll', onScroll)
  scrollRoot = null
})
</script>

<template>
  <Transition name="back-top-fade">
    <button
      v-if="visible"
      type="button"
      class="back-to-top"
      aria-label="回到顶部"
      title="回到顶部"
      @click="scrollToTop"
    >
      <el-icon :size="18"><Top /></el-icon>
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  right: 1.25rem;
  bottom: 5.5rem;
  z-index: 40;
  display: inline-flex;
  height: 2.5rem;
  width: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--bio-teal) 45%, var(--bio-line));
  background: color-mix(in srgb, var(--bio-panel) 88%, #0e7c86);
  color: var(--bio-teal);
  box-shadow: 0 8px 24px rgba(15, 23, 32, 0.12);
  backdrop-filter: blur(8px);
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.back-to-top:hover {
  transform: translateY(-2px);
  background: rgba(14, 124, 134, 0.18);
}

.back-top-fade-enter-active,
.back-top-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.back-top-fade-enter-from,
.back-top-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .back-to-top:hover {
    transform: none;
  }
}
</style>
