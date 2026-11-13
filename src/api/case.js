import http from '@/api/http'
import { compactParams } from '@/utils/format'

export const fetchCases = async (params = {}) => {
  const response = await http.get('/cases', { params: compactParams(params) })
  const total = Number(response.headers['x-total-count'] || response.data.length)
  return { list: response.data, total }
}

export const fetchCase = async (id) => {
  const response = await http.get(`/cases/${id}`)
  return response.data
}

export const createCase = async (payload) => {
  const response = await http.post('/cases', payload)
  return response.data
}

export const updateCase = async (id, payload) => {
  const response = await http.put(`/cases/${id}`, payload)
  return response.data
}

export const patchCase = async (id, payload) => {
  const response = await http.patch(`/cases/${id}`, payload)
  return response.data
}

export const removeCase = async (id) => {
  const response = await http.delete(`/cases/${id}`)
  return response.data
}
