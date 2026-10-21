import { createContext } from 'react'
import type { ThemeMode } from './theme'

export type ThemeContextValue = { mode: ThemeMode; setMode: (mode: ThemeMode) => void; toggleMode: () => void }
export const ThemeContext = createContext<ThemeContextValue | null>(null)
