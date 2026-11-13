import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { stripUser } from '@/utils/format'

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref('')
    const profile = ref(null)
    const isTeacher = computed(() => profile.value?.role === 'teacher')

    const setSession = (user) => {
      const safe = stripUser(user)
      profile.value = safe
      token.value = `bm.${safe.id}.${safe.role}.${Date.now()}`
    }

    const setProfile = (user) => {
      profile.value = stripUser(user)
    }

    const updateProgress = (progress) => {
      if (!profile.value) return
      profile.value = { ...profile.value, progress }
    }

    /** 同步积分 / 问答额度 / 解锁与道具 */
    const syncPoints = (partial) => {
      if (!profile.value || !partial) return
      profile.value = {
        ...profile.value,
        points: Number(partial.points ?? profile.value.points ?? 0),
        lastClaimDate: partial.lastClaimDate ?? profile.value.lastClaimDate ?? null,
        chatQuota: Number(partial.chatQuota ?? profile.value.chatQuota ?? 0),
        unlockedCaseIds: [...(partial.unlockedCaseIds ?? profile.value.unlockedCaseIds ?? [])],
        inventory: [...(partial.inventory ?? profile.value.inventory ?? [])],
        chatFreeDate: partial.chatFreeDate ?? profile.value.chatFreeDate ?? null,
        chatFreeUsed: Number(partial.chatFreeUsed ?? profile.value.chatFreeUsed ?? 0),
        dailyLearningDrawDate:
          partial.dailyLearningDrawDate ?? profile.value.dailyLearningDrawDate ?? null,
      }
    }

    const clear = () => {
      token.value = ''
      profile.value = null
    }

    return { token, profile, isTeacher, setSession, setProfile, updateProgress, syncPoints, clear }
  },
  {
    persist: {
      key: 'bionic-auth',
      storage: localStorage,
      pick: ['token', 'profile'],
    },
  },
)
