'use client'

import type { ChatMessage } from '@/types/events'
import { safeContent } from './safeContent'

interface SystemBubbleProps {
  message: Extract<ChatMessage, { role: 'system' }>
}

export function SystemBubble({ message }: SystemBubbleProps) {
  return (
    <div className="text-xs italic" style={{ color: 'var(--content-muted)' }}>
      {safeContent(message.content)}
    </div>
  )
}
