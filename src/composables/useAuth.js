import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchUsers } from '@/api/user'
import { fetchFavorites } from '@/api/favorite'
import { useUserStore } from '@/stores/user'
import { useFavoriteStore } from '@/stores/favorite'
import { peerName } from '@/utils/format'

export const useAuth = () => {
  const router = useRouter()
  const userStore = useUserStore()
  const favoriteStore = useFavoriteStore()

  const login = async ({ username, password, role }) => {
    const users = await fetchUsers({ username, password }, { silent: true })
    const found = users[0]
    if (!found) {
      throw new Error('账号或密码不正确')
    }
    if (found.role !== role) {
      throw new Error(found.role === 'teacher' ? '这个账号是教师，请切换到教师入口' : '这个账号是学生，请切换到学生入口')
    }
    favoriteStore.reset()
    userStore.setSession(found)
    try {
      const favorites = await fetchFavorites(found.id, { silent: true })
      favoriteStore.hydrate(favorites)
    } catch (err) {
      ElMessage.warning(err.userMessage || '收藏夹暂时没有同步，已保留本地记录')
    }
    ElMessage.success(`欢迎回来，${found.role === 'student' ? peerName(found.name) : found.name}`)
    return found
  }

  const logout = async () => {
    const uid = userStore.profile?.id
    userStore.clear()
    favoriteStore.reset()
    // 下次登录可再次弹出首页欢迎
    try {
      if (uid) sessionStorage.removeItem(`bio-welcome-shown.${uid}`)
    } catch {
      /* ignore */
    }
    await router.push('/login')
  }

  return {
    login,
    logout,
    token: computed(() => userStore.token),
    profile: computed(() => userStore.profile),
    isTeacher: computed(() => userStore.isTeacher),
  }
}
