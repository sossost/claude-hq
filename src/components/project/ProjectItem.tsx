import type { Project } from '@/types/events'

interface ProjectItemProps {
  project: Project
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}

export function ProjectItem({ project, isSelected, onSelect, onRemove }: ProjectItemProps) {
  return (
    <div
      className="group flex items-center gap-1 px-1"
    >
      <button
        onClick={onSelect}
        className="flex-1 text-left px-2 py-2 rounded-md text-sm transition-colors min-w-0"
        style={{
          background: isSelected ? 'var(--surface-hover)' : 'transparent',
          color: 'var(--foreground)',
        }}
      >
        <div className="font-medium text-xs truncate">{project.name}</div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--content-muted)' }}
        aria-label={`Remove ${project.name}`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
