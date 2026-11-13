<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 120 },
  stroke: { type: Number, default: 10 },
  label: { type: String, default: '完成度' },
})

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const offset = computed(() => {
  const ratio = Math.min(Math.max(props.value, 0), 100) / 100
  return circumference.value * (1 - ratio)
})
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="-rotate-90">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="rgba(143,163,184,0.2)"
        :stroke-width="stroke"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="#7BE0AD"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        class="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
      <span class="text-xl font-semibold text-paper">{{ Math.round(value) }}%</span>
      <span class="text-xs text-mist">{{ label }}</span>
    </div>
  </div>
</template>
