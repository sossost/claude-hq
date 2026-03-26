import type { ChatMessage } from '@/types/events'

interface StatusBubbleProps {
  message: Extract<ChatMessage, { role: 'status' }>
}

export function StatusBubble({ message }: StatusBubbleProps) {
  const isDone = message.status === 'done'
  const durationSec = message.duration != null ? (message.duration / 1000).toFixed(1) : null

  return (
    <div className="flex items-center gap-3 text-xs py-2" style={{ color: 'var(--text-muted)' }}>
      <span className={`h-1.5 w-1.5 rounded-full ${isDone ? 'bg-green-500' : 'bg-red-500'}`} />
      <span>{isDone ? 'Completed' : 'Failed'}</span>
      {durationSec != null && <span>{durationSec}s</span>}
      {message.turns != null && <span>{message.turns} turns</span>}
    </div>
  )
}
