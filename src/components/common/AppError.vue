<script setup>
defineProps({
  text: { type: String, default: '加载失败' },
})
defineEmits(['retry'])
</script>

<template>
  <div class="bio-card px-6 py-10 text-center">
    <p class="text-base font-semibold text-paper">没有拿到数据</p>
    <p class="mx-auto mt-2 max-w-md text-sm text-mist">{{ text }}</p>
    <el-button class="mt-5" type="primary" @click="$emit('retry')">重试</el-button>
  </div>
</template>
