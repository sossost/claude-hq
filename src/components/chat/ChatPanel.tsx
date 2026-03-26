'use client'

import type { ChatMessage } from '@/types/events'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

interface ChatPanelProps {
  messages: ChatMessage[]
  isRunning: boolean
  hasProject: boolean
  onSend: (message: string) => void
  onStop: () => void
}

export function ChatPanel({ messages, isRunning, hasProject, onSend, onStop }: ChatPanelProps) {
  return (
    <>
      <ChatMessages messages={messages} isRunning={isRunning} />
      <ChatInput onSend={onSend} onStop={onStop} isRunning={isRunning} disabled={!hasProject} />
    </>
  )
}
