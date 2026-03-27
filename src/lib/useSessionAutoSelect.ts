'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { PersistedSession, SessionSummary } from '@/types/events'

interface UseSessionAutoSelectOptions {
  projectPath: string | null
  sessions: SessionSummary[]
  activeSessionId: string | null
  isRunning: boolean
  selectSession: (id: string) => Promise<PersistedSession | null>
  loadSession: (session: PersistedSession) => void
  setActiveSessionId: (id: string | null) => void
  clear: () => void
  refreshSessions: () => Promise<void>
}

interface UseSessionAutoSelectReturn {
  handleSessionSelect: (id: string) => Promise<void>
  handleSessionDelete: (id: string, deleteFn: (id: string) => Promise<void>) => Promise<void>
  handleNewSession: () => void
}

export function useSessionAutoSelect({
  projectPath,
  sessions,
  activeSessionId,
  isRunning,
  selectSession,
  loadSession,
  setActiveSessionId,
  clear,
  refreshSessions,
}: UseSessionAutoSelectOptions): UseSessionAutoSelectReturn {
  // Prevents auto-select after explicit "New Session" click
  const userClearedRef = useRef(false)

  // Reset user-cleared flag when project changes
  useEffect(() => {
    userClearedRef.current = false
  }, [projectPath])

  // Auto-select most recent session on project change
  useEffect(() => {
    if (userClearedRef.current) return
    if (projectPath == null) return
    if (activeSessionId != null) return

    const projectSessions = sessions.filter((s) => s.projectPath === projectPath)
    const mostRecent = projectSessions.find((s) => s.messageCount > 0)
    if (mostRecent == null) return

    selectSession(mostRecent.id).then((session) => {
      if (session != null) {
        loadSession(session)
      }
    })
  }, [projectPath, sessions, activeSessionId, selectSession, loadSession])

  // Refresh session list after chat completes (title may have updated)
  const wasRunningRef = useRef(false)
  useEffect(() => {
    if (wasRunningRef.current && isRunning === false) {
      refreshSessions()
    }
    wasRunningRef.current = isRunning
  }, [isRunning, refreshSessions])

  const handleSessionSelect = useCallback(async (id: string) => {
    if (id === activeSessionId) return
    const session = await selectSession(id)
    if (session != null) {
      loadSession(session)
    }
  }, [activeSessionId, selectSession, loadSession])

  const handleSessionDelete = useCallback(async (id: string, deleteFn: (id: string) => Promise<void>) => {
    await deleteFn(id)
    if (id === activeSessionId) {
      clear()
    }
  }, [activeSessionId, clear])

  const handleNewSession = useCallback(() => {
    userClearedRef.current = true
    clear()
    setActiveSessionId(null)
  }, [clear, setActiveSessionId])

  return {
    handleSessionSelect,
    handleSessionDelete,
    handleNewSession,
  }
}
