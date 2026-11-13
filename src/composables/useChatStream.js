import { onScopeDispose, ref } from 'vue'

const MIN_STREAM_MS = 3000

/** 按行追加回答；整段不少于 MIN_STREAM_MS；减少动效时一次给出 */
export const useChatStream = () => {
  const streaming = ref(false)
  const buffer = ref('')
  const timer = { id: 0 }

  const cancel = () => {
    window.clearTimeout(timer.id)
    streaming.value = false
  }

  const pushText = (fullText, onTick) => pushLines(fullText, onTick)

  const pushLines = (fullText, onTick) =>
    new Promise((resolve) => {
      cancel()
      streaming.value = true
      buffer.value = ''
      const text = fullText || ''
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (reduced || !text) {
        buffer.value = text
        onTick(buffer.value)
        streaming.value = false
        resolve(buffer.value)
        return
      }

      const lines = text.split('\n')
      let index = 0
      const gaps = Math.max(lines.length - 1, 1)
      const stepDelay = Math.max(80, Math.ceil(MIN_STREAM_MS / gaps))

      const finish = () => {
        streaming.value = false
        resolve(buffer.value)
      }

      const tick = () => {
        if (index >= lines.length) {
          finish()
          return
        }
        const line = lines[index]
        buffer.value = index === 0 ? line : `${buffer.value}\n${line}`
        index += 1
        onTick(buffer.value)

        if (index >= lines.length) {
          timer.id = window.setTimeout(finish, lines.length === 1 ? MIN_STREAM_MS : 0)
          return
        }
        timer.id = window.setTimeout(tick, stepDelay)
      }
      tick()
    })

  onScopeDispose(cancel)

  return { streaming, buffer, pushText, pushLines, cancel }
}
