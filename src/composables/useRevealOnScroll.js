import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * 滚动渐进显现：元素进入视口后标记为可见（滑到哪显示到哪）
 * @param {import('vue').Ref<unknown[]>} itemsRef
 * @param {{ rootMargin?: string; threshold?: number }} [options]
 */
export const useRevealOnScroll = (itemsRef, options = {}) => {
  const visibleIds = ref(new Set())
  const nodeMap = new Map()
  let observer = null

  const rootMargin = options.rootMargin ?? '0px 0px -8% 0px'
  const threshold = options.threshold ?? 0.12

  const isVisible = (id) => visibleIds.value.has(id)

  const markVisible = (id) => {
    if (visibleIds.value.has(id)) return
    const next = new Set(visibleIds.value)
    next.add(id)
    visibleIds.value = next
  }

  const bindEl = (id, el) => {
    if (!el) {
      const prev = nodeMap.get(id)
      if (prev && observer) observer.unobserve(prev)
      nodeMap.delete(id)
      return
    }
    nodeMap.set(id, el)
    if (observer) observer.observe(el)
  }

  const setRevealRef = (id) => (el) => bindEl(id, el)

  const reset = () => {
    visibleIds.value = new Set()
  }

  const setup = () => {
    if (typeof IntersectionObserver === 'undefined') {
      // 无 IO 时直接全部可见
      const all = new Set((itemsRef.value || []).map((item) => item?.id ?? item))
      visibleIds.value = all
      return
    }
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const id = entry.target?.dataset?.revealId
          if (id == null || id === '') return
          // dataset 恒为 string；数字 id 需还原
          const raw = Number.isNaN(Number(id)) ? id : Number(id)
          markVisible(raw)
          observer.unobserve(entry.target)
        })
      },
      { root: null, rootMargin, threshold },
    )
    nodeMap.forEach((el) => observer.observe(el))
  }

  onMounted(setup)

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    nodeMap.clear()
  })

  watch(
    () => (itemsRef.value || []).map((item) => item?.id ?? item).join(','),
    () => {
      // 筛选变化时保留已显现项，新项继续观察
      if (!observer) return
      nodeMap.forEach((el) => observer.observe(el))
    },
  )

  return { visibleIds, isVisible, setRevealRef, reset, markVisible }
}
