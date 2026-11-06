import { useEffect, useState } from 'react'
import type { MapImageStatus } from '../components/canvas/MapBackgroundLayer'

export function useImage(src?: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [status, setStatus] = useState<MapImageStatus>('idle')

  useEffect(() => {
    const normalizedSrc = src?.trim()

    if (!normalizedSrc) {
      setImage(null)
      setStatus('idle')
      return
    }

    const nextImage = new window.Image()
    setImage(null)
    setStatus('loading')
    nextImage.onload = () => {
      setImage(nextImage)
      setStatus('loaded')
    }
    nextImage.onerror = () => {
      setImage(null)
      setStatus('failed')
    }
    nextImage.src = normalizedSrc
  }, [src])

  return { image, status }
}
