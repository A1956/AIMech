<script setup>
defineProps({
  item: { type: Object, required: true },
})
</script>

<template>
  <router-link
    :to="`/cases/${item.id}`"
    class="mt-3 flex gap-3 rounded-xl border border-accent/20 bg-ink/40 p-3 transition hover:border-teal/60"
  >
    <img
      :src="item.cover"
      :alt="item.title"
      class="h-14 w-20 shrink-0 rounded-lg object-cover bg-ink"
      loading="lazy"
      @error="($event) => { $event.target.src = '/covers/gecko.jpg' }"
    />
    <div class="min-w-0">
      <p class="text-xs text-accent">参考案例</p>
      <p class="truncate text-sm font-semibold text-paper">{{ item.title }}</p>
      <p class="truncate text-xs text-mist">{{ item.tags?.slice(0, 2).join(' · ') }}</p>
    </div>
  </router-link>
</template>
