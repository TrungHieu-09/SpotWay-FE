import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GuestTextSize = 'small' | 'medium' | 'large'
export type GuestTheme = 'system' | 'light' | 'dark'
/** Ưu tiên khi đổi tầng: AUTO = rẻ nhất; ELEVATOR = thang máy; AVOID_STEPS = xe lăn (không thang bộ/cuốn). */
export type GuestPriority = 'AUTO' | 'ELEVATOR' | 'AVOID_STEPS'

type GuestPrefsState = {
  textSize: GuestTextSize
  highContrast: boolean
  theme: GuestTheme
  priority: GuestPriority
  /** Hiện thanh kịch bản demo trên bản đồ. */
  demoMode: boolean
  setTextSize: (value: GuestTextSize) => void
  setHighContrast: (value: boolean) => void
  setTheme: (value: GuestTheme) => void
  setPriority: (value: GuestPriority) => void
  setDemoMode: (value: boolean) => void
}

export const useGuestPrefsStore = create<GuestPrefsState>()(
  persist(
    (set) => ({
      textSize: 'medium',
      highContrast: false,
      theme: 'system',
      priority: 'AUTO',
      demoMode: false,
      setTextSize: (textSize) => set({ textSize }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setTheme: (theme) => set({ theme }),
      setPriority: (priority) => set({ priority }),
      setDemoMode: (demoMode) => set({ demoMode }),
    }),
    { name: 'spotway.guest.prefs' },
  ),
)
