'use client'

import { useState, useEffect } from 'react'
import type { AgentDefinition } from '@/types/events'

interface UseAgentsOptions {
  projectPath: string | null
}

interface UseAgentsReturn {
  agents: AgentDefinition[]
  isLoading: boolean
}

export function useAgents({ projectPath }: UseAgentsOptions): UseAgentsReturn {
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)

    const params = new URLSearchParams()
    if (projectPath != null && projectPath !== '') {
      params.set('projectPath', projectPath)
    }

    fetch(`/api/agents?${params}`)
      .then((res) => {
        if (res.ok === false) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setAgents(Array.isArray(data?.agents) ? data.agents : []))
      .catch(() => setAgents([]))
      .finally(() => setIsLoading(false))
  }, [projectPath])

  return { agents, isLoading }
}
