'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, Project, PersistedSession, SessionSettings } from '@/types/events'

const ASSISTANT_CHUNK_MERGE_WINDOW_MS = 500

interface UseChatOptions {
  project: Project | null
  settings?: SessionSettings
}

interface UseChatReturn {
  messages: ChatMessage[]
  isRunning: boolean
  sessionId: string | null
  claudeSessionId: string | null
  activeModel: string | null
  activePermissionMode: string | null
  send: (prompt: string) => void
  stop: () => void
  clear: () => void
  loadSession: (session: PersistedSession) => void
}

export function useChat({ project, settings }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(null)
  const [activeModel, setActiveModel] = useState<string | null>(null)
  const [activePermissionMode, setActivePermissionMode] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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
    const newId = data.session.id as string
    setSessionId(newId)
    return newId
  }, [sessionId, project])

  const send = useCallback(async (prompt: string) => {
    if (project == null) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsRunning(true)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const persistId = await ensureSession()

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

      if (!res.ok || res.body == null) {
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
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6)
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
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'system' as const,
            content: `Error: ${(err as Error).message}`,
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
    setIsRunning(false)
  }, [])

  const clear = useCallback(() => {
    setMessages([])
    setSessionId(null)
    setClaudeSessionId(null)
    setActiveModel(null)
    setActivePermissionMode(null)
  }, [])

  const loadSession = useCallback((session: PersistedSession) => {
    setSessionId(session.id)
    setClaudeSessionId(session.claudeSessionId)
    setMessages(session.messages)
  }, [])

  return { messages, isRunning, sessionId, claudeSessionId, activeModel, activePermissionMode, send, stop, clear, loadSession }
}
