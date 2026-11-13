<script setup>
import { computed } from 'vue'
import { VideoPlay } from '@element-plus/icons-vue'
import { useCaseVideos } from '@/composables/useCaseVideos'
import { difficultyTone } from '@/utils/format'

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const { find } = useCaseVideos()
const shortVideo = computed(() => find(props.item.id))
</script>

<template>
  <router-link
    :to="`/cases/${item.id}`"
    class="bio-card can-lift rise-in block overflow-hidden"
    :style="{ '--i': index }"
  >
    <div class="case-cover-ring relative m-3 h-36 overflow-hidden rounded-xl bg-ink">
      <img :src="item.cover" :alt="item.title" class="h-full w-full object-cover" loading="lazy" />
      <span
        v-if="shortVideo"
        class="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-white/20 bg-ink/85 px-2.5 py-1 text-[11px] font-medium text-accent shadow-sm backdrop-blur"
      >
        <el-icon :size="12"><VideoPlay /></el-icon>
        视频
      </span>
      <span
        class="absolute right-3 top-3 rounded-full bg-panel/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur"
        :class="difficultyTone(item.difficulty)"
      >
        {{ item.difficulty }}
      </span>
    </div>
    <div class="p-4">
      <h3 class="line-clamp-2 text-[0.95rem] font-semibold text-paper">{{ item.title }}</h3>
      <p class="mt-2 line-clamp-2 text-sm text-mist">{{ item.principle }}</p>
      <div class="mt-3 flex flex-wrap gap-1.5">
        <span
          v-for="tag in item.tags.slice(0, 3)"
          :key="tag"
          class="rounded-md bg-teal/15 px-2 py-0.5 text-xs text-accent"
        >
          {{ tag }}
        </span>
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-mist">
        <span>浏览 {{ item.views }}</span>
        <span>收藏 {{ item.likes }}</span>
      </div>
    </div>
  </router-link>
</template>
