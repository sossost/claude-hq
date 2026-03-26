'use client'

import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    const initial = saved ?? 'system'
    setThemeState(initial)
    applyTheme(initial === 'system' ? getSystemTheme() : initial)
  }, [])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(getSystemTheme())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    localStorage.setItem('theme', next)
    applyTheme(next === 'system' ? getSystemTheme() : next)
  }, [])

  const toggle = useCallback(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    const next = resolved === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}
