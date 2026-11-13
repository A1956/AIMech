import { ref } from 'vue'

/** 分页状态与加载。loader 返回 { list, total } */
export const usePagination = (loader) => {
  const page = ref(1)
  const pageSize = ref(6)
  const total = ref(0)
  const loading = ref(true)
  const error = ref('')
  const list = ref([])

  const load = async () => {
    loading.value = true
    error.value = ''
    try {
      const result = await loader({ page: page.value, pageSize: pageSize.value })
      list.value = result.list
      total.value = result.total
    } catch (err) {
      error.value = err.userMessage || '加载失败'
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  const changePage = async (next) => {
    page.value = next
    await load()
  }

  const resetAndLoad = async () => {
    page.value = 1
    await load()
  }

  return { page, pageSize, total, loading, error, list, load, changePage, resetAndLoad }
}
