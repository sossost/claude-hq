import type { ChatMessage } from '@/types/events'

interface AssistantBubbleProps {
  message: Extract<ChatMessage, { role: 'assistant' }>
}

export function AssistantBubble({ message }: AssistantBubbleProps) {
  return (
    <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
      {message.content}
    </div>
  )
}
