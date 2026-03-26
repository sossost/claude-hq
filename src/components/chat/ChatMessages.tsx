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
}

export function ChatMessages({ messages, isRunning }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto py-6 space-y-4">
      {messages.length === 0 && <ChatEmptyState />}

      {messages.map((msg) => (
        <div key={msg.id} className="mx-auto max-w-3xl px-4">
          {msg.role === 'user' && <UserBubble message={msg} />}
          {msg.role === 'assistant' && <AssistantBubble message={msg} />}
          {msg.role === 'tool' && <ToolBubble message={msg} />}
          {msg.role === 'status' && <StatusBubble message={msg} />}
          {msg.role === 'system' && <SystemBubble message={msg} />}
        </div>
      ))}

      {isRunning && (
        <div className="mx-auto max-w-3xl px-4">
          <RunningIndicator />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
