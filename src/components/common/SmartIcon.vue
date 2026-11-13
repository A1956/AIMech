<script setup>
import { computed } from 'vue'
import iconHome from '@/assets/icons/icon-home.svg'
import iconTutor from '@/assets/icons/icon-tutor.svg'
import iconCases from '@/assets/icons/icon-cases.svg'
import iconQuiz from '@/assets/icons/icon-quiz.svg'
import iconDesign from '@/assets/icons/icon-design.svg'
import iconPath from '@/assets/icons/icon-path.svg'
import iconProfile from '@/assets/icons/icon-profile.svg'
import iconAdmin from '@/assets/icons/icon-admin.svg'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
})

const map = {
  home: iconHome,
  tutor: iconTutor,
  cases: iconCases,
  quiz: iconQuiz,
  design: iconDesign,
  path: iconPath,
  profile: iconProfile,
  admin: iconAdmin,
}

const src = computed(() => map[props.name] || iconHome)
</script>

<template>
  <img :src="src" alt="" class="inline-block shrink-0" :style="{ width: `${size}px`, height: `${size}px` }" />
</template>
