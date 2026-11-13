<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

const STORAGE_KEY = 'bio-theme-fab'
const { isDark, toggleTheme } = useTheme()

const fabRef = ref(null)
const ready = ref(false)
const pos = ref({ x: 0, y: 0 })
const dragging = ref(false)
const moved = ref(false)
let start = { x: 0, y: 0, left: 0, top: 0 }
let pointerId = null

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const applyDefault = () => {
  const size = 52
  pos.value = {
    x: Math.max(12, window.innerWidth - size - 20),
    y: Math.round(window.innerHeight / 2 - size / 2),
  }
}

const loadPos = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      applyDefault()
      return
    }
    const parsed = JSON.parse(raw)
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      pos.value = { x: parsed.x, y: parsed.y }
      return
    }
  } catch {
    /* ignore */
  }
  applyDefault()
}

const persist = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pos.value))
}

const onPointerDown = (event) => {
  if (!fabRef.value) return
  dragging.value = true
  moved.value = false
  pointerId = event.pointerId
  fabRef.value.setPointerCapture(pointerId)
  const rect = fabRef.value.getBoundingClientRect()
  start = {
    x: event.clientX,
    y: event.clientY,
    left: rect.left,
    top: rect.top,
  }
}

const onPointerMove = (event) => {
  if (!dragging.value) return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  if (Math.abs(dx) + Math.abs(dy) > 4) moved.value = true
  const size = fabRef.value?.offsetWidth || 52
  pos.value = {
    x: clamp(start.left + dx, 8, window.innerWidth - size - 8),
    y: clamp(start.top + dy, 8, window.innerHeight - size - 8),
  }
}

const onPointerUp = () => {
  if (!dragging.value) return
  dragging.value = false
  if (fabRef.value && pointerId != null) {
    try {
      fabRef.value.releasePointerCapture(pointerId)
    } catch {
      /* ignore */
    }
  }
  pointerId = null
  persist()
}

const onClick = () => {
  if (moved.value) return
  toggleTheme()
}

const onResize = () => {
  if (pos.value.x == null) return
  const size = 52
  pos.value = {
    x: clamp(pos.value.x, 8, window.innerWidth - size - 8),
    y: clamp(pos.value.y, 8, window.innerHeight - size - 8),
  }
}

onMounted(() => {
  loadPos()
  ready.value = true
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <button
    v-show="ready"
    ref="fabRef"
    type="button"
    class="theme-fab"
    :class="{ 'is-dark': isDark, dragging }"
    :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    :aria-label="isDark ? '切换浅色主题' : '切换深色主题'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @click="onClick"
  >
    <!-- 浅色模式展示夜间月亮（可切深色）；深色模式展示太阳（可切浅色） -->
    <svg v-if="!isDark" viewBox="0 0 48 48" class="h-7 w-7" aria-hidden="true">
      <path
        d="M30.5 8.5a15.5 15.5 0 1 0 9 26.2A14 14 0 1 1 30.5 8.5Z"
        fill="#5BA4F5"
      />
      <circle cx="34" cy="14" r="1.6" fill="#B8D9FF" />
      <circle cx="28" cy="20" r="1.1" fill="#B8D9FF" />
    </svg>
    <svg v-else viewBox="0 0 48 48" class="h-7 w-7" aria-hidden="true">
      <circle cx="24" cy="24" r="9" fill="#F5C542" />
      <g stroke="#E8A317" stroke-width="2.4" stroke-linecap="round">
        <path d="M24 6v4M24 38v4M6 24h4M38 24h4M11.5 11.5l2.8 2.8M33.7 33.7l2.8 2.8M11.5 36.5l2.8-2.8M33.7 14.3l2.8-2.8" />
      </g>
    </svg>
  </button>
</template>
