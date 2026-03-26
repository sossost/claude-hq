import type { ChatMessage } from '@/types/events'

interface StatusBubbleProps {
  message: Extract<ChatMessage, { role: 'status' }>
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

function shortModel(fullId: string): string {
  if (fullId.includes('opus')) return 'opus'
  if (fullId.includes('sonnet')) return 'sonnet'
  if (fullId.includes('haiku')) return 'haiku'
  return fullId
}

export function StatusBubble({ message }: StatusBubbleProps) {
  const isDone = message.status === 'done'
  const durationSec = message.duration != null ? (message.duration / 1000).toFixed(1) : null

  if (message.status === 'running') return null

  const parts: string[] = [isDone ? 'Completed' : 'Failed']
  if (durationSec != null) parts.push(`${durationSec}s`)
  if (message.turns != null && message.turns > 0) parts.push(`${message.turns} turns`)
  if (message.cost != null && message.cost > 0) parts.push(formatCost(message.cost))
  if (message.model != null) parts.push(shortModel(message.model))

  return (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--content-muted)' }}>
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: isDone ? 'var(--success)' : 'var(--error)' }}
      />
      <span>{parts.join(' · ')}</span>
    </div>
  )
}
