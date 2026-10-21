import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { createAppTheme, type ThemeMode } from './theme'

const STORAGE_KEY = 'ui:theme'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type ThemeContextValue = { mode: ThemeMode; setMode: (mode: ThemeMode) => void; toggleMode: () => void }
const ThemeContext = createContext<ThemeContextValue | null>(null)

function readMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  useEffect(() => {
    document.documentElement.dataset.theme = mode
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])
  const value = useMemo<ThemeContextValue>(() => ({ mode, setMode: setModeState, toggleMode: () => setModeState((current) => current === 'dark' ? 'light' : 'dark') }), [mode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

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
