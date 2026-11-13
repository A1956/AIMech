import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createFavorite, removeFavorite } from '@/api/favorite'
import { patchCase } from '@/api/case'
import { useFavoriteStore } from '@/stores/favorite'
import { useUserStore } from '@/stores/user'

export const useFavorite = () => {
  const favoriteStore = useFavoriteStore()
  const userStore = useUserStore()
  const pendingId = ref(0)

  const has = (caseId) => favoriteStore.ids.includes(Number(caseId))

  const toggle = async (caseItem) => {
    const caseId = Number(caseItem.id)
    const userId = userStore.profile?.id
    if (!userId || pendingId.value === caseId) return has(caseId)
    pendingId.value = caseId
    const current = favoriteStore.items.find((item) => Number(item.caseId) === caseId)
    try {
      if (current) {
        await removeFavorite(current.id)
        favoriteStore.remove(caseId)
        await patchCase(caseId, { likes: Math.max(0, Number(caseItem.likes || 0) - 1) })
        ElMessage.success('已取消收藏')
        return false
      }
      const created = await createFavorite({
        userId,
        caseId,
        createdAt: new Date().toISOString(),
      })
      favoriteStore.add(created)
      await patchCase(caseId, { likes: Number(caseItem.likes || 0) + 1 })
      ElMessage.success('已收藏到个人中心')
      return true
    } finally {
      pendingId.value = 0
    }
  }

  return {
    items: computed(() => favoriteStore.items),
    has,
    toggle,
    pendingId,
  }
}
