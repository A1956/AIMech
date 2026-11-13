import http from '@/api/http'

/** 试卷列表 */
export const fetchPapers = async (params = {}, config = {}) => {
  const response = await http.get('/papers', {
    params: { _sort: 'createdAt', _order: 'desc', ...params },
    ...config,
  })
  return response.data
}

export const createPaper = async (payload) => {
  const response = await http.post('/papers', payload)
  return response.data
}

export const removePaper = async (id) => {
  const response = await http.delete(`/papers/${id}`)
  return response.data
}
