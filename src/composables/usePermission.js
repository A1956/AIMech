import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

/** 角色权限：学生自测学习；教师管理案例 / 题库 / 组卷 / 学情 */
export const usePermission = () => {
  const userStore = useUserStore()

  const role = computed(() => userStore.profile?.role || '')
  const isStudent = computed(() => role.value === 'student')
  const isTeacher = computed(() => role.value === 'teacher')

  const canTakeQuiz = computed(() => isStudent.value)
  const canManageCases = computed(() => isTeacher.value)
  const canManageQuestions = computed(() => isTeacher.value)
  const canComposePaper = computed(() => isTeacher.value)
  const canViewInsights = computed(() => isTeacher.value)

  const homePath = computed(() => (isTeacher.value ? '/admin' : '/'))

  const assertTeacher = (action = '执行该操作') => {
    if (!isTeacher.value) {
      throw new Error(`仅教师可${action}`)
    }
  }

  return {
    role,
    isStudent,
    isTeacher,
    canTakeQuiz,
    canManageCases,
    canManageQuestions,
    canComposePaper,
    canViewInsights,
    homePath,
    assertTeacher,
  }
}
