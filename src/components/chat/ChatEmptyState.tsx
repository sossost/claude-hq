interface ChatEmptyStateProps {
  projectName?: string
}

export function ChatEmptyState({ projectName }: ChatEmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="text-lg font-medium" style={{ color: 'var(--content-muted)' }}>
          {projectName ?? 'Claude HQ'}
        </div>
        <div className="space-y-1">
          <div className="text-sm" style={{ color: 'var(--content-muted)', opacity: 0.7 }}>
            Ask anything about this project.
          </div>
          <div className="text-xs" style={{ color: 'var(--content-muted)', opacity: 0.5 }}>
            Enter to send
          </div>
        </div>
      </div>
    </div>
  )
}
