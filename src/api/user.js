import http from '@/api/http'
import { compactParams } from '@/utils/format'

export const fetchUsers = async (params = {}, config = {}) => {
  const response = await http.get('/users', { params: compactParams(params), ...config })
  return response.data
}

export const fetchUser = async (id) => {
  const response = await http.get(`/users/${id}`)
  return response.data
}

export const patchUser = async (id, payload) => {
  const response = await http.patch(`/users/${id}`, payload)
  return response.data
}
