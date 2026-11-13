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
let chart = null

const render = () => {
  if (!elRef.value) return
  if (!chart) chart = echarts.init(elRef.value, null, { renderer: 'canvas' })
  chart.setOption(props.option, true)
}

const onResize = () => chart?.resize()

onMounted(() => {
  render()
  window.addEventListener('resize', onResize)
})

watch(() => props.option, render, { deep: true })
watch(theme, () => {
  // 主题切换后重绘，读取最新 CSS 变量色
  render()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="elRef" class="w-full" :style="{ height }" />
</template>
