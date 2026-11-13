<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { VideoPlay } from '@element-plus/icons-vue'
import { useCaseVideos } from '@/composables/useCaseVideos'

const props = defineProps({
  caseId: { type: Number, required: true },
  title: { type: String, default: '' },
})

const { find, status } = useCaseVideos()
const video = computed(() => find(props.caseId))

const active = ref(false)
const paused = ref(true)
const ended = ref(false)
const showCredits = ref(false)
const player = ref(null)
const playButton = ref(null)

const start = async () => {
  if (!video.value) return
  active.value = true
  ended.value = false
  await nextTick()
  // 无音轨，浏览器一般允许直接播放；被自动播放策略拦截时停在首帧，由中间按钮兜底
  const result = player.value?.play?.()
  if (result?.catch) result.catch(() => {})
}

const resume = () => {
  if (!player.value) return
  if (ended.value) {
    ended.value = false
    player.value.currentTime = 0
  }
  const result = player.value.play?.()
  if (result?.catch) result.catch(() => {})
}

const stop = () => {
  if (player.value) {
    player.value.pause()
    player.value.currentTime = 0
  }
  active.value = false
  ended.value = false
  paused.value = true
  nextTick(() => playButton.value?.focus?.())
}

const replay = () => {
  resume()
}

const onEnded = () => {
  ended.value = true
  paused.value = true
}

/** 点击画面切换播放；底部 48px 留给原生控制条，避免误触 */
const onVideoClick = (event) => {
  const rect = event.currentTarget?.getBoundingClientRect?.()
  if (rect && event.clientY > rect.bottom - 48) return
  // 浏览器默认也会切换播放状态，先取消默认行为避免双重切换
  event.preventDefault?.()
  if (player.value?.paused) resume()
  else player.value?.pause?.()
}

const onKeydown = (event) => {
  if (event.key === 'Escape' && active.value) stop()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  stop()
})
</script>

<template>
  <section v-if="video" id="short-video" class="bio-card overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
      <div>
        <h2 class="text-base font-semibold text-accent">案例视频</h2>
        <p class="mt-1 text-xs text-mist">
          {{ video.width }}×{{ video.height }} · {{ video.format }} / {{ video.codec }} ·
          {{ video.audio ? '含音轨' : '无音轨' }}
        </p>
      </div>
      <button
        v-if="active"
        type="button"
        class="rounded-lg border border-[color:var(--bio-line)] px-3 py-1 text-xs text-mist transition hover:text-paper"
        @click="stop"
      >
        关闭视频
      </button>
    </div>

    <div class="relative mt-3 aspect-[16/9] w-full bg-black">
      <template v-if="active">
        <video
          ref="player"
          :src="video.src"
          :poster="video.poster"
          class="h-full w-full object-contain"
          controls
          playsinline
          preload="metadata"
          :aria-label="`${title || video.title} 案例视频`"
          @play="paused = false"
          @pause="paused = true"
          @ended="onEnded"
          @click="onVideoClick"
        >
          你的浏览器暂不支持 MP4 视频播放。
        </video>

        <button
          v-if="paused && !ended"
          type="button"
          class="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/95 text-ink shadow-lg transition hover:scale-105"
          aria-label="播放视频"
          @click="resume"
        >
          <el-icon :size="24"><VideoPlay /></el-icon>
        </button>
      </template>

      <template v-else>
        <img
          :src="video.poster"
          :alt="`${title || video.title} 视频封面`"
          class="h-full w-full object-cover"
          loading="lazy"
        />
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/35">
          <button
            ref="playButton"
            type="button"
            class="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink shadow-lg transition hover:scale-[1.03]"
            :aria-label="`播放${title || video.title}案例视频`"
            @click="start"
          >
            <el-icon :size="18"><VideoPlay /></el-icon>
            播放
          </button>
        </div>
      </template>

      <button
        v-if="ended"
        type="button"
        class="absolute bottom-14 left-1/2 -translate-x-1/2 rounded-full bg-accent/95 px-4 py-2 text-xs font-semibold text-ink"
        @click="replay"
      >
        重播
      </button>
    </div>

    <div class="px-5 py-4">
      <p class="text-sm text-mist">
        观察生物原型的形态与运动，再回到下方「生物原型 / 仿生原理」对照参数。视频为教学示意，不替代实验数据。
      </p>

      <button
        type="button"
        class="mt-3 flex items-center gap-1 text-xs text-accent hover:underline"
        :aria-expanded="showCredits"
        @click="showCredits = !showCredits"
      >
        {{ showCredits ? '收起素材来源' : '查看素材来源与许可' }}
      </button>

      <div v-if="showCredits" class="mt-2 space-y-2 rounded-xl border border-[color:var(--bio-line)] p-3 text-xs text-mist">
        <p v-for="(credit, index) in video.credits" :key="`${video.caseId}-${index}`" class="flex flex-wrap gap-x-2">
          <span class="text-paper/80">{{ index + 1 }}. {{ credit.caption }}</span>
          <a
            v-if="credit.sourceUrl"
            :href="credit.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-accent hover:underline"
          >
            {{ credit.author || '查看原图' }} · Pexels
          </a>
          <span v-else>{{ credit.author }}</span>
        </p>
        <p v-if="video.license" class="border-t border-[color:var(--bio-line)] pt-2">
          图片依据
          <a
            :href="video.license.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-accent hover:underline"
          >
            {{ video.license.name }}
          </a>
          使用；署名仅用于来源追溯。
        </p>
      </div>

      <p v-if="status === 'error'" class="mt-2 text-xs text-mist">
        素材清单加载失败，视频入口暂不可用，案例正文不受影响。
      </p>
    </div>
  </section>
</template>
