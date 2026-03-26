import type { ChatMessage } from '@/types/events'

interface StatusBubbleProps {
  message: Extract<ChatMessage, { role: 'status' }>
}

export function StatusBubble({ message }: StatusBubbleProps) {
  const isDone = message.status === 'done'
  const durationSec = message.duration != null ? (message.duration / 1000).toFixed(1) : null

  return (
    <div className="flex items-center gap-3 text-xs py-2" style={{ color: 'var(--content-muted)' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: isDone ? 'var(--success)' : 'var(--error)' }} />
      <span>{isDone ? 'Completed' : 'Failed'}</span>
      {durationSec != null && <span>{durationSec}s</span>}
      {message.turns != null && <span>{message.turns} turns</span>}
    </div>
  )
}
