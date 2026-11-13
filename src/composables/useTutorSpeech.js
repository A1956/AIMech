import { onScopeDispose, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { synthesizeSpeechChunks, ttsConfigured, ttsConfigHint } from '@/utils/ttsEngine'

const VOICE_PREF_KEY = 'bio-tutor-voice-reply'

/** 小智语音回答：默认国内免费 TTS，失败回退系统女声 */
export const useTutorSpeech = () => {
  const voiceReply = ref(localStorage.getItem(VOICE_PREF_KEY) === '1')
  const speaking = ref(false)
  const loadingSpeech = ref(false)
  /** @type {HTMLAudioElement | null} */
  let audio = null
  /** @type {string[]} */
  let objectUrls = []

  const setVoiceReply = (on) => {
    voiceReply.value = Boolean(on)
    localStorage.setItem(VOICE_PREF_KEY, voiceReply.value ? '1' : '0')
    if (!voiceReply.value) stop()
  }

  const clearUrls = () => {
    objectUrls.forEach((url) => URL.revokeObjectURL(url))
    objectUrls = []
  }

  const stop = () => {
    if (audio) {
      audio.pause()
      audio.src = ''
      audio = null
    }
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    clearUrls()
    speaking.value = false
    loadingSpeech.value = false
  }

  const playBlobQueue = (blobs) =>
    new Promise((resolve, reject) => {
      let i = 0
      const playNext = () => {
        if (i >= blobs.length) {
          speaking.value = false
          clearUrls()
          resolve()
          return
        }
        const url = URL.createObjectURL(blobs[i])
        objectUrls.push(url)
        i += 1
        audio = new Audio(url)
        audio.onended = playNext
        audio.onerror = () => {
          speaking.value = false
          reject(new Error('音频播放失败'))
        }
        speaking.value = true
        audio.play().catch(reject)
      }
      playNext()
    })

  /**
   * @param {string} text
   * @param {{ silentFail?: boolean }} [opts]
   */
  const speak = async (text, opts = {}) => {
    if (!text?.trim()) return
    if (!ttsConfigured()) {
      if (!opts.silentFail) ElMessage.warning(ttsConfigHint())
      return
    }
    stop()
    loadingSpeech.value = true
    try {
      const result = await synthesizeSpeechChunks(text)
      loadingSpeech.value = false
      if (result === 'browser') {
        speaking.value = false
        return
      }
      if (!result?.length) return
      await playBlobQueue(result)
    } catch (err) {
      loadingSpeech.value = false
      speaking.value = false
      if (!opts.silentFail) {
        // 不展示“服务器异常”类硬错误，改为轻提示
        ElMessage.warning(err.userMessage || '语音暂时不可用，请稍后再试')
      }
    }
  }

  const speakIfEnabled = async (text) => {
    if (!voiceReply.value) return
    await speak(text, { silentFail: true })
  }

  onScopeDispose(stop)

  return {
    voiceReply,
    speaking,
    loadingSpeech,
    setVoiceReply,
    speak,
    speakIfEnabled,
    stop,
    ttsReady: ttsConfigured,
  }
}
