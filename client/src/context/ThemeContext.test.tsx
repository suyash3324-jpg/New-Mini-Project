// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeContext'

function ThemeControl() {
  const { preference, setPreference } = useTheme()
  return <label>Theme
    <select aria-label="Color theme" value={preference} onChange={(event) => setPreference(event.target.value as 'light' | 'dark' | 'system')}>
      <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
    </select>
  </label>
}

describe('theme preference', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    })
  })
  afterEach(() => cleanup())

  it('applies and persists light, dark, and system selections', async () => {
    render(<ThemeProvider><ThemeControl /></ThemeProvider>)
    const selector = screen.getByRole('combobox', { name: 'Color theme' })
    fireEvent.change(selector, { target: { value: 'dark' } })
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(localStorage.getItem('shopinsight-theme')).toBe('dark')
    fireEvent.change(selector, { target: { value: 'light' } })
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    fireEvent.change(selector, { target: { value: 'system' } })
    await waitFor(() => expect(localStorage.getItem('shopinsight-theme')).toBe('system'))
  })

  it('restores the selected theme preference after mount', async () => {
    localStorage.setItem('shopinsight-theme', 'dark')
    render(<ThemeProvider><ThemeControl /></ThemeProvider>)
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect((screen.getByRole('combobox', { name: 'Color theme' }) as HTMLSelectElement).value).toBe('dark')
  })
})
