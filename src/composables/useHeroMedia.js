import { onMounted, ref } from 'vue'
import heroFallback from '@/assets/illustrations/hero-biomech.svg'

/** 优先使用 public/media 下已授权图，否则回退 SVG */
export const useHeroMedia = () => {
  const src = ref(heroFallback)
  const isPhoto = ref(false)

  onMounted(() => {
    const candidates = ['/media/hero.jpg', '/media/hero.png', '/media/hero.webp']
    const probe = (index) => {
      if (index >= candidates.length) return
      const img = new Image()
      img.onload = () => {
        src.value = candidates[index]
        isPhoto.value = true
      }
      img.onerror = () => probe(index + 1)
      img.src = candidates[index]
    }
    probe(0)
  })

  return { src, isPhoto, fallback: heroFallback }
}
