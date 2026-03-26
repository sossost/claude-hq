export function ChatEmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <div className="text-2xl" style={{ color: 'var(--content-muted)' }}>Claude HQ</div>
        <div className="text-sm" style={{ color: 'var(--content-muted)' }}>Mission Control</div>
      </div>
    </div>
  )
}
