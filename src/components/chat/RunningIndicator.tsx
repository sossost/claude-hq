export function RunningIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--content-secondary)' }}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: 'var(--success-muted)' }} />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--success)' }} />
      </span>
      Running...
    </div>
  )
}
