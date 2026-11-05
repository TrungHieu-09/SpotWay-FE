import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'sw-theme-mode'
// Mặc định 'dark' trong lúc các trang còn lại chưa chuyển hết sang token trung tính.
const DEFAULT_MODE: ThemeMode = 'dark'

function readStoredMode(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'auto') return value
  } catch {
    // localStorage bị chặn: dùng mặc định
  }
  return DEFAULT_MODE
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveDark(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === 'auto' && prefersDark())
}

function applyToDocument(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
}

type ThemeState = {
  mode: ThemeMode
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

let transitionTimer: number | null = null

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialMode = readStoredMode()
  const initialDark = resolveDark(initialMode)
  applyToDocument(initialDark)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (get().mode !== 'auto') return
    const isDark = resolveDark('auto')
    applyToDocument(isDark)
    set({ isDark })
  })

  return {
    mode: initialMode,
    isDark: initialDark,
    setMode: (mode) => {
      const isDark = resolveDark(mode)
      const root = document.documentElement
      root.classList.add('sw-theme-transitioning')
      if (transitionTimer !== null) window.clearTimeout(transitionTimer)
      transitionTimer = window.setTimeout(() => root.classList.remove('sw-theme-transitioning'), 360)
      applyToDocument(isDark)
      try {
        localStorage.setItem(STORAGE_KEY, mode)
      } catch {
        // bỏ qua
      }
      set({ mode, isDark })
    },
    toggle: () => get().setMode(get().isDark ? 'light' : 'dark'),
  }
})
