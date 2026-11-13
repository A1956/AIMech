import http from '@/api/http'

/** 题库列表（可按科目 / 难度筛选） */
export const fetchQuestions = async (params = {}, config = {}) => {
  const response = await http.get('/questions', {
    params: { _sort: 'id', _order: 'asc', ...params },
    ...config,
  })
  return response.data
}

export const createQuestion = async (payload) => {
  const response = await http.post('/questions', payload)
  return response.data
}

export const updateQuestion = async (id, payload) => {
  const response = await http.put(`/questions/${id}`, payload)
  return response.data
}

export const removeQuestion = async (id) => {
  const response = await http.delete(`/questions/${id}`)
  return response.data
}
