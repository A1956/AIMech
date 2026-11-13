import http from '@/api/http'

export const fetchFavorites = async (userId, config = {}) => {
  const response = await http.get('/favorites', { params: { userId }, ...config })
  return response.data
}

export const createFavorite = async (payload) => {
  const response = await http.post('/favorites', payload)
  return response.data
}

export const removeFavorite = async (id) => {
  const response = await http.delete(`/favorites/${id}`)
  return response.data
}
