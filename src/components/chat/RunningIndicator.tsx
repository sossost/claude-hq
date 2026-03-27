const STAGGER_MS = 300
const DOT_DELAYS = [0, STAGGER_MS, STAGGER_MS * 2] as const

export function RunningIndicator() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1">
        {DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--content-muted)', animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
