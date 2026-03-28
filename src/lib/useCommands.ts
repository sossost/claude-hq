'use client'

import { useState, useEffect } from 'react'
import type { CommandDefinition } from '@/types/events'

interface UseCommandsOptions {
  projectPath: string | null
}

interface UseCommandsReturn {
  commands: CommandDefinition[]
  isLoading: boolean
  error: Error | null
}

function isValidCommand(x: unknown): x is CommandDefinition {
  if (typeof x !== 'object' || x == null) return false
  const record = x as Record<string, unknown>
  return (
    typeof record.name === 'string' &&
    typeof record.description === 'string' &&
    typeof record.template === 'string' &&
    (record.source === 'project' || record.source === 'global' || record.source === 'builtin')
  )
}

export function useCommands({ projectPath }: UseCommandsOptions): UseCommandsReturn {
  const [commands, setCommands] = useState<CommandDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (projectPath != null && projectPath !== '') {
      params.set('projectPath', projectPath)
    }

    fetch(`/api/commands?${params}`, { signal: controller.signal })
      .then((res) => {
        if (res.ok === false) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        const raw = data?.data?.commands
        setCommands(Array.isArray(raw) ? raw.filter(isValidCommand) : [])
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setCommands([])
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [projectPath])

  return { commands, isLoading, error }
}
