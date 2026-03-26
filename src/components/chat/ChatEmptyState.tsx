interface ChatEmptyStateProps {
  projectName?: string
}

export function ChatEmptyState({ projectName }: ChatEmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4 max-w-sm">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mx-auto"
          style={{ background: 'var(--accent-muted)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3C7.03 3 3 6.58 3 11c0 2.48 1.33 4.7 3.42 6.17-.18 1.45-.83 2.67-1.39 3.46-.13.18.04.42.25.37 1.62-.38 3.2-1.15 4.22-1.88.47.06.96.09 1.5.09 4.97 0 9-3.58 9-8s-4.03-8-9-8Z"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <div className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
            {projectName ?? 'Claude HQ'}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--content-muted)' }}>
            Ask anything about this project
          </div>
        </div>
      </div>
    </div>
  )
}
