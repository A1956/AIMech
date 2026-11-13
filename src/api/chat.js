import http from '@/api/http'

export const fetchConversations = async (userId) => {
  const response = await http.get('/conversations', {
    params: { userId, _sort: 'updatedAt', _order: 'desc' },
  })
  return response.data
}

export const createConversation = async (payload) => {
  const response = await http.post('/conversations', payload)
  return response.data
}

export const patchConversation = async (id, payload) => {
  const response = await http.patch(`/conversations/${id}`, payload)
  return response.data
}

export const removeConversation = async (id, config = {}) => {
  const response = await http.delete(`/conversations/${id}`, config)
  return response.data
}

export const fetchMessages = async (conversationId, config = {}) => {
  const response = await http.get('/messages', {
    params: { conversationId, _sort: 'createdAt', _order: 'asc' },
    ...config,
  })
  return response.data
}

/** 教师学情：拉取全部消息用于高频问题合并 */
export const fetchAllMessages = async () => {
  const response = await http.get('/messages', {
    params: { _sort: 'createdAt', _order: 'desc' },
  })
  return response.data
}

export const createMessage = async (payload) => {
  const response = await http.post('/messages', payload)
  return response.data
}

export const removeMessage = async (id, config = {}) => {
  const response = await http.delete(`/messages/${id}`, config)
  return response.data
}
