'use client'

import { useState, useCallback, useEffect } from 'react'
import type { PersistedSession, SessionSummary } from '@/types/events'

interface UseSessionsOptions {
  projectPath: string | null
}

interface UseSessionsReturn {
  sessions: SessionSummary[]
  activeSessionId: string | null
  isLoading: boolean
  createSession: () => Promise<PersistedSession>
  selectSession: (id: string) => Promise<PersistedSession | null>
  deleteSession: (id: string) => Promise<void>
  setActiveSessionId: (id: string | null) => void
  refresh: () => Promise<void>
}

export function useSessions({ projectPath }: UseSessionsOptions): UseSessionsReturn {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    if (projectPath == null) {
      setSessions([])
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/sessions')
      if (res.ok === false) return

      const data = await res.json()
      const all = Array.isArray(data?.sessions) ? (data.sessions as SessionSummary[]) : []
      const filtered = all.filter((s) => s.projectPath === projectPath)
      setSessions(filtered)
    } catch {
      // Fetch failure is non-fatal
    } finally {
      setIsLoading(false)
    }
  }, [projectPath])

  // Refetch when project changes — clear stale sessions immediately
  useEffect(() => {
    setActiveSessionId(null)
    setSessions([])
    fetchSessions()
  }, [fetchSessions])

  const createSession = useCallback(async (): Promise<PersistedSession> => {
    if (projectPath == null) {
      throw new Error('Cannot create session: no project selected')
    }

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        projectName: projectPath.split('/').pop() ?? 'default',
      }),
    })

    if (res.ok === false) {
      throw new Error(`Failed to create session: ${res.status}`)
    }

    const data = await res.json()
    if (data?.session?.id == null) {
      throw new Error('Invalid session response')
    }
    const session = data.session as PersistedSession
    setActiveSessionId(session.id)
    await fetchSessions()
    return session
  }, [projectPath, fetchSessions])

  const selectSession = useCallback(async (id: string): Promise<PersistedSession | null> => {
    try {
      const params = new URLSearchParams({ id })
      const res = await fetch(`/api/sessions?${params}`)
      if (res.ok === false) return null

      const data = await res.json()
      if (data.session != null) {
        setActiveSessionId(id)
        return data.session as PersistedSession
      }
      return null
    } catch {
      return null
    }
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    const params = new URLSearchParams({ id })
    const res = await fetch(`/api/sessions?${params}`, { method: 'DELETE' })

    if (res.ok === false) {
      throw new Error(`Failed to delete session: ${res.status}`)
    }

    if (activeSessionId === id) {
      setActiveSessionId(null)
    }

    await fetchSessions()
  }, [activeSessionId, fetchSessions])

  const refresh = fetchSessions

  return {
    sessions,
    activeSessionId,
    isLoading,
    createSession,
    selectSession,
    deleteSession,
    setActiveSessionId,
    refresh,
  }
}
