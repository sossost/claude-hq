import type { ChatMessage } from '@/types/events'

interface SystemBubbleProps {
  message: Extract<ChatMessage, { role: 'system' }>
}

export function SystemBubble({ message }: SystemBubbleProps) {
  return (
    <div className="text-xs italic" style={{ color: 'var(--content-muted)' }}>
      {message.content}
    </div>
  )
}
