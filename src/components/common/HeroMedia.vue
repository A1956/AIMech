<script setup>
import { onMounted, ref } from 'vue'
import heroSvg from '@/assets/illustrations/hero-biomech.svg'

defineProps({
  alt: { type: String, default: 'AIMech' },
  className: { type: String, default: '' },
})

const src = ref(heroSvg)

onMounted(() => {
  const img = new Image()
  img.onload = () => {
    src.value = '/media/hero.jpg'
  }
  img.onerror = () => {
    const png = new Image()
    png.onload = () => {
      src.value = '/media/hero.png'
    }
    png.src = '/media/hero.png'
  }
  img.src = '/media/hero.jpg'
})
</script>

<template>
  <img :src="src" :alt="alt" :class="className" loading="lazy" />
</template>
