/**
 * useColorMode — manages dark/light mode state with localStorage persistence
 * and a time-based default (light 7am–6pm, dark otherwise).
 *
 * Rules:
 * - If the user has ever manually toggled, their preference wins (stored in localStorage).
 * - On first visit (no stored preference), default is light if local hour is 7–17, else dark.
 * - Applies/removes the `light` class on <html> on every render.
 */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'mc-color-mode'
const STORAGE_MANUAL_KEY = 'mc-color-mode-manual'

function getTimeDefault(): 'light' | 'dark' {
  const hour = new Date().getHours()
  return hour >= 7 && hour < 18 ? 'light' : 'dark'
}

function readPreference(): 'light' | 'dark' {
  const manual = localStorage.getItem(STORAGE_MANUAL_KEY)
  if (manual === '1') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  }
  return getTimeDefault()
}

function applyClass(mode: 'light' | 'dark') {
  if (mode === 'light') {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
}

export function useColorMode() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const pref = readPreference()
    applyClass(pref)
    return pref
  })

  // Keep <html> class in sync whenever mode changes
  useEffect(() => {
    applyClass(mode)
  }, [mode])

  const toggle = useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      localStorage.setItem(STORAGE_MANUAL_KEY, '1')
      return next
    })
  }, [])

  return { mode, toggle, isLight: mode === 'light' }
}
