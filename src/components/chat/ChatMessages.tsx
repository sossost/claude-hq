'use client'

import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@/types/events'
import { UserBubble } from './messages/UserBubble'
import { AssistantBubble } from './messages/AssistantBubble'
import { ToolBubble } from './messages/ToolBubble'
import { StatusBubble } from './messages/StatusBubble'
import { SystemBubble } from './messages/SystemBubble'
import { ChatEmptyState } from './ChatEmptyState'
import { RunningIndicator } from './RunningIndicator'

interface ChatMessagesProps {
  messages: ChatMessage[]
  isRunning: boolean
  projectName?: string
}

export function ChatMessages({ messages, isRunning, projectName }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const lastAssistantIndex = messages.reduce(
    (acc, m, i) => (m.role === 'assistant' ? i : acc),
    -1,
  )

  return (
    <div className="flex-1 overflow-y-auto py-6 space-y-3" role="log" aria-live="polite" aria-label="Chat messages">
      {messages.length === 0 && <ChatEmptyState projectName={projectName} />}

      {messages.map((msg, index) => {
        const isLastAssistant = isRunning
          && msg.role === 'assistant'
          && index === lastAssistantIndex

        return (
          <div key={msg.id} className="mx-auto max-w-3xl px-4">
            {msg.role === 'user' && <UserBubble message={msg} />}
            {msg.role === 'assistant' && (
              <AssistantBubble message={msg} isStreaming={isLastAssistant} />
            )}
            {msg.role === 'tool' && <ToolBubble message={msg} />}
            {msg.role === 'status' && <StatusBubble message={msg} />}
            {msg.role === 'system' && <SystemBubble message={msg} />}
          </div>
        )
      })}

      {isRunning && (
        <div className="mx-auto max-w-3xl px-4">
          <RunningIndicator />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
