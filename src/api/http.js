import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 12000,
})

const resolveMessage = (error) => {
  if (error.code === 'ECONNABORTED') return '请求超时，请稍后重试'
  if (!error.response) return '无法连接数据服务，请先在另一个终端运行 npm run mock'
  const status = error.response.status
  if (status === 404) return '没有找到对应的数据'
  if (status >= 500) return '数据服务异常，请稍后重试'
  return '请求失败，请稍后重试'
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = resolveMessage(error)
    error.userMessage = message
    if (!error.config?.silent) {
      ElMessage.error({ message, grouping: true, duration: 2800 })
    }
    return Promise.reject(error)
  },
)

export default http
