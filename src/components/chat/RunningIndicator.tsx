export function RunningIndicator() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: 'var(--content-muted)', animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: 'var(--content-muted)', animationDelay: '300ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: 'var(--content-muted)', animationDelay: '600ms' }}
        />
      </div>
    </div>
  )
}
