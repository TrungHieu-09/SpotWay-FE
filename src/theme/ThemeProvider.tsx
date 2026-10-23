import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ThemeMode } from './theme'
import { ThemeContext } from './ThemeContext'

const STORAGE_KEY = 'ui:theme'
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
  const value = useMemo(() => ({ mode, setMode: setModeState, toggleMode: () => setModeState((current) => current === 'dark' ? 'light' : 'dark') }), [mode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
