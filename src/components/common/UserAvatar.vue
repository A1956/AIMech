<script setup>
import { computed, ref, watch } from 'vue'
import { STUDENT_DEFAULT_AVATAR } from '@/utils/avatar'
import { initials } from '@/utils/format'

const props = defineProps({
  avatar: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: Number, default: 40 },
  student: { type: Boolean, default: false },
})

const customImageFailed = ref(false)
const fallbackImageFailed = ref(false)
const fallbackSrc = computed(() =>
  props.student ? STUDENT_DEFAULT_AVATAR : '',
)
const imageSrc = computed(() => {
  if (props.avatar === 'initials') return ''
  if (props.avatar && !customImageFailed.value) return props.avatar
  if (fallbackSrc.value && !fallbackImageFailed.value) return fallbackSrc.value
  return ''
})

const onImageError = () => {
  if (props.avatar && props.avatar !== 'initials' && !customImageFailed.value) {
    customImageFailed.value = true
  } else {
    fallbackImageFailed.value = true
  }
}

watch(
  () => [props.avatar, props.student],
  () => {
    customImageFailed.value = false
    fallbackImageFailed.value = false
  },
)
</script>

<template>
  <span
    class="user-avatar"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="name ? `${name}头像` : '用户头像'"
  >
    <img v-if="imageSrc" :key="imageSrc" :src="imageSrc" alt="" @error="onImageError">
    <span v-else>{{ initials(name) }}</span>
  </span>
</template>

<style scoped>
.user-avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid rgba(14, 124, 134, 0.2);
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(14, 124, 134, 0.2), rgba(31, 169, 122, 0.1));
  color: var(--bio-teal);
  font-size: 0.95em;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(14, 124, 134, 0.12);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
</style>
