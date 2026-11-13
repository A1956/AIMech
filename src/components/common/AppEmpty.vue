<script setup>
defineProps({
  title: { type: String, default: '这里还是空的' },
  text: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center px-6 py-14 text-center">
    <div class="mb-4 h-14 w-14 rounded-full border border-accent/30 bg-teal/10" />
    <p class="text-base font-semibold text-paper">{{ title }}</p>
    <p v-if="text" class="mt-2 max-w-md text-sm text-mist">{{ text }}</p>
    <div class="mt-4"><slot /></div>
  </div>
</template>
