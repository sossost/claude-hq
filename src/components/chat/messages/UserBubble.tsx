import type { ChatMessage } from '@/types/events'

interface UserBubbleProps {
  message: Extract<ChatMessage, { role: 'user' }>
}

export function UserBubble({ message }: UserBubbleProps) {
  return (
    <div className="flex justify-end">
      <div
        className="rounded-2xl px-4 py-2.5 text-sm max-w-[80%]"
        style={{ background: 'var(--user-bubble)', color: 'var(--user-bubble-text)' }}
      >
        {message.content}
      </div>
    </div>
  )
}
