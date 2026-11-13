import http from '@/api/http'

export const fetchCourses = async () => {
  const response = await http.get('/courses', { params: { _sort: 'order', _order: 'asc' } })
  return response.data
}
