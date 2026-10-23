import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
type ThemeContextValue = { preference: ThemePreference; setPreference: (theme: ThemePreference) => void }

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'shopinsight-theme'

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // Keep the default when browser storage is unavailable.
  }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const activeTheme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference
      document.documentElement.dataset.theme = activeTheme
      document.documentElement.style.colorScheme = activeTheme
    }
    apply()
    if (preference === 'system') media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preference])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // Theme continues to work for the current tab when storage is unavailable.
    }
  }, [preference])

  const value = useMemo(() => ({ preference, setPreference }), [preference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
