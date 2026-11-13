import http from '@/api/http'

/** 作答记录 */
export const fetchQuizAttempts = async (params = {}, config = {}) => {
  const response = await http.get('/quizAttempts', {
    params: { _sort: 'createdAt', _order: 'desc', ...params },
    ...config,
  })
  return response.data
}

export const createQuizAttempt = async (payload) => {
  const response = await http.post('/quizAttempts', payload)
  return response.data
}
