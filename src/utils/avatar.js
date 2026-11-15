const MAX_SOURCE_SIZE = 5 * 1024 * 1024
const MAX_DATA_URL_SIZE = 200 * 1024
const MAX_IMAGE_EDGE = 256
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const STUDENT_DEFAULT_AVATAR = '/media/student-avatar-default.png'

const getCompressedDataUrl = (canvas, quality) => {
  const webp = canvas.toDataURL('image/webp', quality)
  return webp.startsWith('data:image/webp')
    ? webp
    : canvas.toDataURL('image/jpeg', quality)
}

export const compressAvatarImage = async (file) => {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error('请选择 PNG、JPEG 或 WebP 图片')
  }
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error('图片不能超过 5MB')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = objectUrl
    try {
      await image.decode()
    } catch {
      throw new Error('图片格式无效或无法读取')
    }
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('图片尺寸无效，无法设置为头像')
    }

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法处理这张图片')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    let dataUrl = getCompressedDataUrl(canvas, 0.9)
    for (let quality = 0.8; dataUrl.length > MAX_DATA_URL_SIZE && quality >= 0.3; quality -= 0.1) {
      dataUrl = getCompressedDataUrl(canvas, quality)
    }
    if (dataUrl.length > MAX_DATA_URL_SIZE) {
      throw new Error('图片压缩后仍超过 200KB，请选择更简单的图片')
    }
    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
