'use client'

import { useState, useEffect, useRef } from 'react'
import type { Project } from '@/types/events'

interface ProjectImportDialogProps {
  onImport: (path: string) => Promise<void>
  onClose: () => void
}

export function ProjectImportDialog({ onImport, onClose }: ProjectImportDialogProps) {
  const [available, setAvailable] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/projects?available=1')
      .then((res) => res.json())
      .then((data) => setAvailable(data.projects ?? []))
      .catch(() => setAvailable([]))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const filtered = search === ''
    ? available
    : available.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
        || p.path.toLowerCase().includes(search.toLowerCase()),
      )

  async function handleImport(project: Project) {
    await onImport(project.path)
    setAvailable((prev) => prev.filter((p) => p.path !== project.path))
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) {
      onClose()
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 id="import-dialog-title" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Import Project
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            autoFocus
            className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Loading...
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              {available.length === 0 ? 'No projects available to import' : 'No matching projects'}
            </div>
          )}

          {filtered.map((project) => (
            <div
              key={project.path}
              className="flex items-center justify-between px-4 py-2.5 transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {project.name}
                </div>
                <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {project.path}
                </div>
              </div>
              <button
                onClick={() => handleImport(project)}
                className="shrink-0 ml-3 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: 'var(--btn-primary)',
                  color: 'var(--btn-primary-text)',
                }}
              >
                Import
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
