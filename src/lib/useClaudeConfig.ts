'use client'

import { useState, useEffect } from 'react'

export interface ClaudeDefaults {
  model: string | null
  effortLevel: string | null
  permissionMode: string | null
}

const STORAGE_KEY = 'claudeDefaults'

function loadCached(): ClaudeDefaults | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw != null) return JSON.parse(raw) as ClaudeDefaults
  } catch {
    // Ignore
  }
  return null
}

export function useClaudeConfig(): ClaudeDefaults {
  const [defaults, setDefaults] = useState<ClaudeDefaults>(() => {
    if (typeof window === 'undefined') return { model: null, effortLevel: null, permissionMode: null }
    return loadCached() ?? { model: null, effortLevel: null, permissionMode: null }
  })

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data: ClaudeDefaults) => {
        setDefaults(data)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      })
      .catch(() => {
        // Config fetch failure is non-fatal
      })
  }, [])

  return defaults
}
