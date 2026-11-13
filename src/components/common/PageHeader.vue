<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <header class="page-header relative mb-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold tracking-wide text-paper md:text-2xl">{{ title }}</h1>
      <div class="page-header-actions flex flex-wrap items-center gap-2">
        <slot />
      </div>
    </div>
    <div v-if="$slots.subtitle" class="mt-1 max-w-3xl text-sm text-mist">
      <slot name="subtitle" />
    </div>
    <p v-else-if="subtitle" class="mt-1 max-w-3xl text-sm text-mist">{{ subtitle }}</p>
  </header>
</template>
