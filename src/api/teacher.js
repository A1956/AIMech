import http from '@/api/http'

export const fetchTeachingRecords = async () => {
  const response = await http.get('/teachingRecords', {
    params: { _sort: 'date', _order: 'desc' },
  })
  return response.data
}

export const fetchTutoringRecords = async () => {
  const response = await http.get('/tutoringRecords', {
    params: { _sort: 'date', _order: 'desc' },
  })
  return response.data
}
