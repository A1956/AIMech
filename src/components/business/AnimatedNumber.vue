<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 1400 },
  decimals: { type: Number, default: 0 },
})

const displayValue = ref(0)
let frame = 0

const animateTo = (target) => {
  if (frame) cancelAnimationFrame(frame)

  const endValue = Number.isFinite(Number(target)) ? Number(target) : 0
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion || props.duration <= 0) {
    displayValue.value = endValue
    return
  }

  const startValue = displayValue.value
  const startedAt = performance.now()
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / props.duration)
    const eased = 1 - (1 - progress) ** 3
    displayValue.value = startValue + (endValue - startValue) * eased
    if (progress < 1) frame = requestAnimationFrame(tick)
    else frame = 0
  }
  frame = requestAnimationFrame(tick)
}

watch(() => props.value, animateTo, { immediate: true })
onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <span>{{ displayValue.toFixed(decimals) }}</span>
</template>
