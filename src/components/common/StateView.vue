<script setup>
import AppEmpty from '@/components/common/AppEmpty.vue'
import AppError from '@/components/common/AppError.vue'

defineProps({
  loading: Boolean,
  error: { type: String, default: '' },
  empty: Boolean,
  emptyTitle: { type: String, default: '这里还是空的' },
  emptyText: { type: String, default: '' },
})
defineEmits(['retry'])
</script>

<template>
  <div v-if="loading">
    <slot name="loading">
      <div class="bio-card p-5">
        <el-skeleton animated :rows="4" />
      </div>
    </slot>
  </div>
  <AppError v-else-if="error" :text="error" @retry="$emit('retry')" />
  <AppEmpty v-else-if="empty" :title="emptyTitle" :text="emptyText">
    <slot name="empty" />
  </AppEmpty>
  <slot v-else />
</template>
