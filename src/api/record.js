import http from '@/api/http'

export const fetchRecords = async (params = {}) => {
  const response = await http.get('/records', {
    params: { ...params, _sort: 'createdAt', _order: 'desc' },
  })
  return response.data
}

export const createRecord = async (payload) => {
  const response = await http.post('/records', payload)
  return response.data
}

export const removeRecord = async (id) => {
  const response = await http.delete(`/records/${id}`)
  return response.data
}
