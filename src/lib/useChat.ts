'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatMessage, Project, PersistedSession, SessionSettings, SendOptions } from '@/types/events'

function isValidPersistedSession(v: unknown): v is PersistedSession {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    (typeof s.claudeSessionId === 'string' || s.claudeSessionId === null) &&
    Array.isArray(s.messages)
  )
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

const ASSISTANT_CHUNK_MERGE_WINDOW_MS = 500
const SSE_DATA_PREFIX = 'data: '
const RECOVERY_POLL_INTERVAL_MS = 2_000
const RECOVERY_TIMEOUT_MS = 5 * 60 * 1_000

interface UseChatOptions {
  project: Project | null
  settings?: SessionSettings
  onSessionCreated?: (sessionId: string) => void
}

interface UseChatReturn {
  messages: ChatMessage[]
  isRunning: boolean
  isRecovering: boolean
  sessionId: string | null
  claudeSessionId: string | null
  activeModel: string | null
  activePermissionMode: string | null
  send: (prompt: string, options?: SendOptions) => void
  stop: () => void
  clear: () => void
  clearMessages: () => void
  loadSession: (session: PersistedSession) => void
}

export function useChat({ project, settings, onSessionCreated }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(null)
  const [activeModel, setActiveModel] = useState<string | null>(null)
  const [activePermissionMode, setActivePermissionMode] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesLengthRef = useRef(0)

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId != null) return sessionId

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: project?.path ?? '',
        projectName: project?.name ?? 'default',
      }),
    })
    const data = await res.json()
    const newId = data?.data?.session?.id
    if (typeof newId !== 'string') {
      throw new Error('Failed to create session')
    }
    setSessionId(newId)
    onSessionCreated?.(newId)
    return newId
  }, [sessionId, project, onSessionCreated])

  const send = useCallback(async (prompt: string, options?: SendOptions) => {
    if (project == null) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: options?.displayContent ?? prompt,
      timestamp: Date.now(),
    }
    setMessages((prev) => {
      const next = [...prev, userMsg]
      messagesLengthRef.current = next.length
      return next
    })
    setIsRunning(true)

    const abort = new AbortController()
    abortRef.current = abort

    // Hoisted so catch can access it for recovery
    let persistId: string | null = null

    try {
      persistId = await ensureSession()

      // Save user message to server
      await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: persistId,
          messages: [userMsg],
        }),
      }).catch(() => {
        // Save failure is non-fatal — chat continues
      })

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          cwd: project.path,
          claudeSessionId,
          persistSessionId: persistId,
          settings,
        }),
        signal: abort.signal,
      })

      if (res.ok === false || res.body == null) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith(SSE_DATA_PREFIX) === false) continue
          const json = line.slice(SSE_DATA_PREFIX.length)
          try {
            const msg = JSON.parse(json)

            // Close event — update claudeSessionId
            if (msg.type === 'close') {
              if (msg.claudeSessionId != null) {
                setClaudeSessionId(msg.claudeSessionId)
              }
              continue
            }

            // Extract claudeSessionId, model, permissionMode from status message
            if (msg.role === 'status' && msg.sessionId != null) {
              setClaudeSessionId(msg.sessionId)
              if (typeof msg.model === 'string') {
                setActiveModel(msg.model)
              }
              if (typeof msg.permissionMode === 'string') {
                setActivePermissionMode(msg.permissionMode)
              }
            }

            // Merge consecutive assistant text chunks
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              const isAssistantMsg = msg.role === 'assistant'
                && typeof msg.content === 'string'
              if (
                isAssistantMsg &&
                last != null &&
                last.role === 'assistant' &&
                Date.now() - last.timestamp < ASSISTANT_CHUNK_MERGE_WINDOW_MS
              ) {
                const incomingThinking = typeof msg.thinking === 'string' ? msg.thinking : undefined
                const mergedThinking = incomingThinking != null
                  ? (last.thinking ?? '') + incomingThinking
                  : last.thinking
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content: last.content + (msg.content as string),
                    ...(mergedThinking != null ? { thinking: mergedThinking } : {}),
                  },
                ]
              }
              return [...prev, msg as ChatMessage]
            })
          } catch {
            // Ignore parse failures
          }
        }
      }
    } catch (err) {
      if (toError(err).name === 'AbortError') return

      if (persistId != null) {
        // SSE dropped but the claude process may still be running on the server.
        // Enter recovery mode: poll the session endpoint until messages appear.
        const recoverySessionId = persistId
        const knownCount = messagesLengthRef.current // includes user message already added
        const disconnectMsgId = `disconnect-${Date.now()}`
        const recoveryStartTime = Date.now()

        setMessages((prev) => [
          ...prev,
          {
            id: disconnectMsgId,
            role: 'system' as const,
            content: 'Connection lost. Checking for completed response...',
            timestamp: Date.now(),
          },
        ])
        setIsRecovering(true)

        const poll = () => {
          if (Date.now() - recoveryStartTime > RECOVERY_TIMEOUT_MS) {
            setIsRecovering(false)
            setMessages((prev) => [
              ...prev.filter((m) => m.id !== disconnectMsgId),
              {
                id: `recovery-failed-${Date.now()}`,
                role: 'system' as const,
                content: 'Recovery timed out. Check the session list to see if a response was saved.',
                timestamp: Date.now(),
              },
            ])
            return
          }

          fetch(`/api/sessions?id=${encodeURIComponent(recoverySessionId)}`)
            .then((res) => res.json())
            .then((raw: unknown) => {
              const data = raw != null && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
              const dataField = data?.data != null && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : null
              const sessionField = dataField?.session
              if (isValidPersistedSession(sessionField) && sessionField.messages.length > knownCount) {
                setSessionId(sessionField.id)
                setClaudeSessionId(sessionField.claudeSessionId)
                setMessages(sessionField.messages)
                setIsRecovering(false)
              } else {
                pollingRef.current = setTimeout(poll, RECOVERY_POLL_INTERVAL_MS)
              }
            })
            .catch(() => {
              pollingRef.current = setTimeout(poll, RECOVERY_POLL_INTERVAL_MS)
            })
        }

        pollingRef.current = setTimeout(poll, RECOVERY_POLL_INTERVAL_MS)
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'system' as const,
            content: `Error: ${toError(err).message}`,
            timestamp: Date.now(),
          },
        ])
      }
    } finally {
      setIsRunning(false)
      abortRef.current = null
    }
  }, [project, claudeSessionId, ensureSession, settings])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    if (pollingRef.current != null) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    setIsRecovering(false)
    setIsRunning(false)
  }, [])

  const clear = useCallback(() => {
    if (pollingRef.current != null) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    setIsRecovering(false)
    setMessages([])
    setSessionId(null)
    setClaudeSessionId(null)
    setActiveModel(null)
    setActivePermissionMode(null)
  }, [])

  const clearMessages = useCallback(() => {
    if (pollingRef.current != null) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    setIsRecovering(false)
    setMessages([])
    setClaudeSessionId(null)

    // Persist clear to session store
    if (sessionId != null) {
      fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, clear: true }),
      }).catch(() => {
        // Non-fatal
      })
    }
  }, [sessionId])

  const loadSession = useCallback((session: PersistedSession) => {
    if (pollingRef.current != null) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    setIsRecovering(false)
    setSessionId(session.id)
    setClaudeSessionId(session.claudeSessionId)
    setMessages(session.messages)
  }, [])

  // Cancel polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current != null) {
        clearTimeout(pollingRef.current)
      }
    }
  }, [])

  return { messages, isRunning, isRecovering, sessionId, claudeSessionId, activeModel, activePermissionMode, send, stop, clear, clearMessages, loadSession }
}
