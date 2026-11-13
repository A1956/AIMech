<script setup>
import { computed } from 'vue'
import logoUrl from '@/assets/logo.png'
import { PRODUCT_NAME } from '@/types/labels'

/**
 * 品牌 logo：圆形白底图标，圆外透明。
 * 统一尺寸档位，避免各处写死 h-x w-x 造成视觉不一致。
 */
const props = defineProps({
  /** sm 32 / md 36 / lg 40 / xl 48 */
  size: { type: String, default: 'md' },
  /** 留空时使用「AIMech 标志」 */
  alt: { type: String, default: '' },
})

const SIZE_CLASS = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
  xl: 'h-11 w-11',
  '2xl': 'h-12 w-12',
}

const SIZE_PX = { sm: 32, md: 36, lg: 40, xl: 44, '2xl': 48 }

const sizeClass = computed(() => SIZE_CLASS[props.size] || SIZE_CLASS.md)
const sizePx = computed(() => SIZE_PX[props.size] || SIZE_PX.md)
const altText = computed(() => props.alt || `${PRODUCT_NAME} 标志`)
</script>

<template>
  <img
    :src="logoUrl"
    :alt="altText"
    :width="sizePx"
    :height="sizePx"
    :class="['brand-logo shrink-0 object-contain', sizeClass]"
    decoding="async"
    draggable="false"
  />
</template>
