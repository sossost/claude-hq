'use client'

interface SessionItemProps {
  id: string
  title: string
  messageCount: number
  updatedAt: number
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export function SessionItem({
  title,
  messageCount,
  updatedAt,
  isActive,
  onSelect,
  onDelete,
}: SessionItemProps) {
  return (
    <div className="group flex items-center gap-1 px-1">
      <button
        onClick={onSelect}
        className="flex-1 text-left px-2 py-1.5 rounded-md transition-colors min-w-0"
        style={{
          background: isActive ? 'var(--surface-hover)' : 'transparent',
          color: 'var(--foreground)',
        }}
      >
        <div className="text-xs truncate" style={{ fontWeight: isActive ? 600 : 400 }}>
          {title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: 'var(--content-muted)' }}>
            {messageCount} msgs
          </span>
          <span className="text-[10px]" style={{ color: 'var(--content-muted)' }}>
            {formatRelativeTime(updatedAt)}
          </span>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        style={{ color: 'var(--content-muted)' }}
        aria-label="Delete session"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp

  if (diff < MINUTE_MS) return 'just now'
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m ago`
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h ago`
  return `${Math.floor(diff / DAY_MS)}d ago`
}
