<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import heroSvg from '@/assets/illustrations/hero-biomech.svg'
import patternUrl from '@/assets/illustrations/pattern-honeycomb.svg'

const props = defineProps({
  /** 可选封面路径，失败时回退本地插画 */
  covers: { type: Array, default: () => [] },
  interval: { type: Number, default: 4500 },
})

const index = ref(0)
const resolved = ref([])
let timer = null
const reduced = ref(false)

const slides = computed(() => (resolved.value.length ? resolved.value : [heroSvg, patternUrl]))

const probe = (url) =>
  new Promise((ok) => {
    const img = new Image()
    img.onload = () => ok(url)
    img.onerror = () => ok(null)
    img.src = url
  })

const resolveSlides = async () => {
  const candidates = [
    '/media/slide-1.jpg',
    '/media/slide-2.jpg',
    '/media/slide-3.jpg',
    '/media/hero.jpg',
    '/media/hero.png',
    ...props.covers.filter(Boolean),
  ]
  const found = []
  for (const url of candidates) {
    const hit = await probe(url)
    if (hit) found.push(hit)
    if (found.length >= 4) break
  }
  if (!found.length) {
    resolved.value = [heroSvg, patternUrl]
    return
  }
  // 至少两张以形成轮播
  resolved.value = found.length === 1 ? [found[0], patternUrl] : found
}

const go = (next) => {
  const n = slides.value.length
  if (!n) return
  index.value = (next + n) % n
}

const next = () => go(index.value + 1)

const stop = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const start = () => {
  stop()
  if (reduced.value || slides.value.length < 2) return
  timer = setInterval(next, props.interval)
}

onMounted(async () => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  await resolveSlides()
  start()
})

watch(slides, start)

onBeforeUnmount(stop)
</script>

<template>
  <div class="apple-carousel group relative overflow-hidden rounded-2xl" @mouseenter="stop" @mouseleave="start">
    <div class="relative aspect-[21/9] min-h-[160px] w-full sm:min-h-[200px]">
      <transition name="fade" mode="out-in">
        <img
          :key="slides[index]"
          :src="slides[index]"
          alt=""
          class="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      </transition>
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
    </div>
    <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
      <button
        v-for="(s, i) in slides"
        :key="`${s}-${i}`"
        type="button"
        class="h-1.5 rounded-full transition-all duration-300"
        :class="i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'"
        :aria-label="`第 ${i + 1} 张`"
        @click="go(i)"
      />
    </div>
  </div>
</template>
