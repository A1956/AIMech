import http from '@/api/http'

/** 高频问题种子（教师看板） */
export const fetchQuestionStats = async () => {
  const response = await http.get('/questionStats', {
    params: { _sort: 'count', _order: 'desc' },
  })
  return response.data
}

/** 教学视频列表 */
export const fetchVideos = async (params = {}) => {
  const response = await http.get('/videos', {
    params: { _sort: 'views', _order: 'desc', ...params },
  })
  return response.data
}

/** 知识点薄弱项 */
export const fetchKnowledgeWeakness = async () => {
  const response = await http.get('/knowledgeWeakness', {
    params: { _sort: 'weakRate', _order: 'desc' },
  })
  return response.data
}
