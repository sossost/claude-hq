'use client'

import type { ChatMessage } from '@/types/events'
import { safeContent } from './safeContent'

interface UserBubbleProps {
  message: Extract<ChatMessage, { role: 'user' }>
}

export function UserBubble({ message }: UserBubbleProps) {
  return (
    <div className="flex justify-end">
      <div
        className="rounded-2xl px-4 py-2.5 text-sm max-w-[80%]"
        style={{ background: 'var(--chat-user)', color: 'var(--chat-user-foreground)' }}
      >
        {safeContent(message.content)}
      </div>
    </div>
  )
}
