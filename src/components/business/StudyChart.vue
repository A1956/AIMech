<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from '@/composables/useTheme'

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  type: { type: String, default: 'line' },
  option: { type: Object, required: true },
  height: { type: String, default: '260px' },
})

const { theme } = useTheme()
const elRef = ref(null)
const isVisible = ref(false)
let chart = null
let observer = null
let renderFrame = 0

const render = () => {
  if (!elRef.value || !isVisible.value) return
  if (!chart) chart = echarts.init(elRef.value, null, { renderer: 'canvas' })
  chart.setOption(
    {
      animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      animationDuration: 1400,
      animationDurationUpdate: 800,
      animationEasing: 'cubicOut',
      ...props.option,
    },
    true,
  )
}

const onResize = () => chart?.resize()

onMounted(() => {
  const reveal = () => {
    isVisible.value = true
    observer?.disconnect()
    if (renderFrame) cancelAnimationFrame(renderFrame)
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0
      render()
    })
  }

  if (typeof IntersectionObserver === 'undefined') {
    reveal()
  } else {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal()
      },
      { rootMargin: '80px 0px' },
    )
    observer.observe(elRef.value)
  }
  window.addEventListener('resize', onResize)
})

watch(() => props.option, render, { deep: true })
watch(theme, () => {
  // 主题切换后重绘，读取最新 CSS 变量色
  render()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  observer?.disconnect()
  observer = null
  if (renderFrame) cancelAnimationFrame(renderFrame)
  renderFrame = 0
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="elRef" class="w-full" :style="{ height }" />
</template>
