<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  /** 倒计时总秒数；>0 时后台仍按限时触发超时 */
  limitSec: { type: Number, default: 0 },
  /** 是否答题中 */
  running: { type: Boolean, default: false },
  /** 开始时间戳（ms） */
  startedAt: { type: Number, default: 0 },
})

const emit = defineEmits(['timeout'])

const now = ref(Date.now())
/** 答题中：false=正计时，true=倒计时 */
const showCountdown = ref(true)
let timer = null

const pad = (n) => String(n).padStart(2, '0')

const formatDuration = (sec) => {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  const h = Math.floor(m / 60)
  if (h > 0) return `${pad(h)}:${pad(m % 60)}:${pad(r)}`
  return `${pad(m)}:${pad(r)}`
}

const elapsedSec = computed(() => {
  if (!props.startedAt) return 0
  return Math.max(0, Math.floor((now.value - props.startedAt) / 1000))
})

const remainSec = computed(() => {
  if (!props.limitSec) return 0
  return Math.max(0, props.limitSec - elapsedSec.value)
})

const displaySec = computed(() => (showCountdown.value ? remainSec.value : elapsedSec.value))
const displayLabel = computed(() => (showCountdown.value ? '剩余' : '已用'))

const urgent = computed(
  () => props.running && props.limitSec > 0 && remainSec.value <= 60,
)

const toggleMode = () => {
  if (!props.running || !props.limitSec) return
  showCountdown.value = !showCountdown.value
}

let fired = false
watch(
  () => [remainSec.value, props.running],
  ([remain, running]) => {
    if (!running || !props.limitSec || fired) return
    if (remain <= 0) {
      fired = true
      emit('timeout')
    }
  },
)

watch(
  () => props.startedAt,
  () => {
    fired = false
    showCountdown.value = true
  },
)

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 250)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

defineExpose({ elapsedSec, remainSec })
</script>

<template>
  <!-- 答题中：仅正计时/可切倒计时（当前时间改由标题行弱化展示） -->
  <div
    v-if="running"
    class="quiz-clock quiz-clock--run flex w-full flex-col items-center justify-center rounded-xl border border-[color:var(--bio-line)] bg-ink/40 px-4 py-3"
    :class="{ 'is-urgent': urgent }"
  >
    <p class="text-xs text-mist">{{ displayLabel }}时间</p>
    <p
      class="mt-1 font-mono text-2xl font-semibold tracking-wide md:text-[1.75rem]"
      :class="showCountdown ? (urgent ? 'text-red-400' : 'text-sand') : 'text-teal'"
    >
      {{ formatDuration(displaySec) }}
    </p>
    <button
      v-if="limitSec"
      type="button"
      class="mt-2 text-xs text-accent underline-offset-2 hover:underline"
      @click="toggleMode"
    >
      {{ showCountdown ? '切换为正计时' : '切换为倒计时' }}
    </button>
  </div>
</template>

<style scoped>
.quiz-clock.is-urgent {
  border-color: rgba(229, 72, 77, 0.45);
  background: rgba(229, 72, 77, 0.08);
}
</style>
