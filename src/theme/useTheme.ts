import { useContext, useEffect, useMemo, useState } from 'react'
import { createAppTheme } from './theme'
import { ThemeContext } from './ThemeContext'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme phải được dùng bên trong ThemeProvider')
  return context
}

export function useAppTheme(reducedMotion: boolean) {
  const { mode } = useTheme()
  return useMemo(() => createAppTheme(mode, reducedMotion), [mode, reducedMotion])
}

export function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reducedMotion
}
