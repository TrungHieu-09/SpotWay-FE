import { useEffect, useState } from 'react'
import { buildWallMask, type WallMask } from '../utils/wallMask'

const MAX_DIMENSION = 1600

/**
 * Mặt nạ tường dựng từ ảnh sơ đồ để cảnh báo edge xuyên tường. Trả null khi chưa có ảnh, ảnh chưa tải xong
 * hoặc máy chủ ảnh không cho đọc điểm ảnh (thiếu CORS) — khi đó tính năng kiểm tra tường tự tắt.
 */
export function useWallMask(imageUrl: string | null): WallMask | null {
  const [state, setState] = useState<{ url: string; mask: WallMask | null }>()

  useEffect(() => {
    if (!imageUrl) return
    let cancelled = false
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      try {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
        const width = Math.max(1, Math.round(image.naturalWidth * scale))
        const height = Math.max(1, Math.round(image.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Canvas không khả dụng')
        context.drawImage(image, 0, 0, width, height)
        const { data } = context.getImageData(0, 0, width, height)
        if (!cancelled) setState({ url: imageUrl, mask: buildWallMask(data, width, height) })
      } catch {
        if (!cancelled) setState({ url: imageUrl, mask: null }) // canvas bị "tainted" do thiếu CORS
      }
    }
    image.onerror = () => {
      if (!cancelled) setState({ url: imageUrl, mask: null })
    }
    // Tham số phụ để trình duyệt không dùng lại bản ảnh đã cache từ lần tải không-CORS của <Stage>.
    image.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}wm=1`
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return state && state.url === imageUrl ? state.mask : null
}
