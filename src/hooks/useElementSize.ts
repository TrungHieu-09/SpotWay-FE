import { useEffect, useRef, useState } from 'react'

export function useElementSize<T extends HTMLElement>(isEnabled: boolean) {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!isEnabled || !element) {
      setSize({ width: 0, height: 0 })
      return
    }

    const updateSize = (entry: ResizeObserverEntry) => {
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      })
    }

    const observer = new ResizeObserver(([entry]) => updateSize(entry))
    observer.observe(element)

    const bounds = element.getBoundingClientRect()
    setSize({ width: Math.floor(bounds.width), height: Math.floor(bounds.height) })

    return () => observer.disconnect()
  }, [isEnabled])

  return [ref, size] as const
}
