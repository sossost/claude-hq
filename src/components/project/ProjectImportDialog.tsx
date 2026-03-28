'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
      .then((data) => setAvailable(Array.isArray(data?.data?.projects) ? data.data.projects : []))
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

  return createPortal(
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--overlay)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
    >
      <div
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md rounded-xl shadow-2xl overflow-hidden mx-4"
        style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 id="import-dialog-title" className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Import Project
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--content-muted)' }}
            aria-label="Close dialog"
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
            autoFocus={typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches}
            className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
            style={{
              background: 'var(--surface)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          />
        </div>

        <div className="max-h-80 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          {isLoading && (
            <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--content-muted)' }}>
              Loading...
            </div>
          )}

          {isLoading === false && filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--content-muted)' }}>
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
                <div className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                  {project.name}
                </div>
                <div className="text-[10px] truncate" style={{ color: 'var(--content-muted)' }}>
                  {project.path}
                </div>
              </div>
              <button
                onClick={() => handleImport(project)}
                className="shrink-0 ml-3 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                }}
              >
                Import
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
