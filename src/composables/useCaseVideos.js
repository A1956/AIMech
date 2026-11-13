import { computed, onMounted, ref } from 'vue'

/**
 * 案例视频清单。
 *
 * 清单与视频、原始照片放在同一目录（public/media/cases），
 * 由 scripts/build-case-videos.py 读取并生成，避免前端再维护一份副本。
 * 前端只读，加载失败时静默隐藏视频入口，不影响案例正文。
 */
const MANIFEST_URL = '/media/cases/sources.json'

const list = ref([])
const status = ref('idle')
const error = ref('')
let pending = null

const normalize = (raw) => {
  const meta = raw?.video || {}
  return (raw?.cases || [])
    .filter((entry) => entry && entry.caseId && entry.slug)
    .map((entry) => {
      const frames = Array.isArray(entry.frames) ? entry.frames : []
      const cover = frames.find((frame) => frame.kind === 'cover')
      return {
        caseId: Number(entry.caseId),
        slug: entry.slug,
        title: entry.title || '',
        src: `/media/cases/${entry.slug}.mp4`,
        poster: cover?.image || `/covers/${entry.slug}.jpg`,
        duration: Number(entry.duration ?? meta.duration) || 8,
        width: Number(meta.width) || 1280,
        height: Number(meta.height) || 720,
        format: meta.format || 'MP4',
        codec: meta.codec || 'H.264',
        audio: Boolean(meta.audio),
        credits: frames.map((frame) => ({
          caption: frame.caption || '',
          author: frame.author || frame.credit || '',
          sourceUrl: frame.sourceUrl || '',
        })),
        license: raw?.license || null,
      }
    })
}

/** 首次调用发起请求，之后复用同一份 Promise，多个组件共享结果 */
export const loadCaseVideos = () => {
  if (status.value === 'ready') return Promise.resolve(list.value)
  if (pending) return pending

  status.value = 'loading'
  pending = fetch(MANIFEST_URL, { headers: { Accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })
    .then((raw) => {
      list.value = normalize(raw)
      status.value = 'ready'
      error.value = ''
      return list.value
    })
    .catch((err) => {
      list.value = []
      status.value = 'error'
      error.value = err?.message || '清单加载失败'
      return list.value
    })
    .finally(() => {
      pending = null
    })

  return pending
}

export const useCaseVideos = () => {
  const byCaseId = computed(() => new Map(list.value.map((item) => [item.caseId, item])))

  onMounted(loadCaseVideos)

  return {
    list,
    status,
    error,
    load: loadCaseVideos,
    find: (caseId) => byCaseId.value.get(Number(caseId)) || null,
  }
}
