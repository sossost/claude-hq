'use client'

import { useState } from 'react'
import type { Project } from '@/types/events'
import { ProjectItem } from './ProjectItem'
import { ProjectImportDialog } from './ProjectImportDialog'

interface ProjectListProps {
  projects: Project[]
  selected: Project | null
  onSelect: (project: Project) => void
  onImport: (path: string) => Promise<void>
  onRemove: (path: string) => Promise<void>
  isLoading: boolean
}

export function ProjectList({
  projects,
  selected,
  onSelect,
  onImport,
  onRemove,
  isLoading,
}: ProjectListProps) {
  const [isImportOpen, setIsImportOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="px-3 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Projects
        </span>
        <button
          onClick={() => setIsImportOpen(true)}
          className="text-[10px] font-medium transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          + Import
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        {projects.length === 0 && (
          <div className="px-3 py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            No projects imported
          </div>
        )}
        {projects.map((project) => (
          <ProjectItem
            key={project.path}
            project={project}
            isSelected={selected?.path === project.path}
            onSelect={() => onSelect(project)}
            onRemove={() => onRemove(project.path)}
          />
        ))}
      </div>

      {isImportOpen && (
        <ProjectImportDialog
          onImport={onImport}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </div>
  )
}
