'use client'

import { useState, useCallback } from 'react'
import type { SessionSettings } from '@/types/events'
import { DEFAULT_SESSION_SETTINGS } from '@/types/events'

const STORAGE_KEY = 'sessionSettings'

function loadSavedSettings(): SessionSettings {
  if (typeof window === 'undefined') return DEFAULT_SESSION_SETTINGS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved != null) return JSON.parse(saved) as SessionSettings
  } catch {
    // Parse failure — use defaults
  }
  return DEFAULT_SESSION_SETTINGS
}

interface UseSessionSettingsReturn {
  settings: SessionSettings
  updateSettings: (next: SessionSettings) => void
}

export function useSessionSettings(): UseSessionSettingsReturn {
  const [settings, setSettings] = useState<SessionSettings>(loadSavedSettings)

  const updateSettings = useCallback((next: SessionSettings) => {
    setSettings(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  return { settings, updateSettings }
}
