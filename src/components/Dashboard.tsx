'use client'

import { useState, useEffect } from 'react'
import { useChat } from '@/lib/useChat'
import { useTheme } from '@/lib/useTheme'
import { useProjects } from '@/lib/useProjects'
import { ChatPanel } from '@/components/chat'
import { ProjectList } from '@/components/project'
import type { Project, PersistedSession } from '@/types/events'

export default function Dashboard() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { projects, isLoading: projectsLoading, importProject, removeProject } = useProjects()
  const { messages, isRunning, send, stop, clear, loadSession } = useChat({
    project: selectedProject,
  })
  const { toggle, theme } = useTheme()

  // Restore last used project
  useEffect(() => {
    if (projects.length === 0) return

    const lastPath = localStorage.getItem('lastProjectPath')
    if (lastPath != null) {
      const found = projects.find((p) => p.path === lastPath)
      if (found != null) {
        setSelectedProject(found)
        return
      }
    }

    setSelectedProject(projects[0])
  }, [projects])

  // Restore last session for the selected project
  useEffect(() => {
    if (selectedProject == null) return

    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data) => {
        const sessions = data.sessions as Array<PersistedSession & { messageCount: number }>
        const lastSession = sessions.find(
          (s) => s.projectPath === selectedProject.path && s.messageCount > 0,
        )
        if (lastSession == null) return

        return fetch(`/api/sessions?id=${lastSession.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.session != null) {
              loadSession(data.session)
            }
          })
      })
      .catch(() => {
        // Restore failure is non-fatal
      })
  }, [selectedProject, loadSession])

  function handleProjectSelect(project: Project) {
    if (project.path === selectedProject?.path) return
    setSelectedProject(project)
    localStorage.setItem('lastProjectPath', project.path)
    clear()
  }

  async function handleProjectRemove(path: string) {
    await removeProject(path)
    if (selectedProject?.path === path) {
      setSelectedProject(null)
      clear()
    }
  }

  function handleNewSession() {
    clear()
  }

  const hasProject = selectedProject != null

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="p-1 rounded-md transition-colors"
            style={{ color: 'var(--content-muted)' }}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Claude HQ
          </h1>
          {selectedProject != null && (
            <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--content-muted)' }}>
              {selectedProject.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--success)' }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: 'var(--success-muted)' }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--success)' }} />
              </span>
              Running
            </span>
          )}
          <button
            onClick={toggle}
            className="text-xs transition-colors"
            style={{ color: 'var(--content-muted)' }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={handleNewSession}
            className="text-xs transition-colors"
            style={{ color: 'var(--content-muted)' }}
            aria-label="Start a new chat session"
          >
            New Session
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {isSidebarOpen && (
          <aside
            className="w-60 shrink-0 overflow-hidden"
            style={{
              borderRight: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <ProjectList
              projects={projects}
              selected={selectedProject}
              onSelect={handleProjectSelect}
              onImport={importProject}
              onRemove={handleProjectRemove}
              isLoading={projectsLoading}
            />
          </aside>
        )}

        <main className="flex-1 flex flex-col min-w-0">
          <ChatPanel
            messages={messages}
            isRunning={isRunning}
            hasProject={hasProject}
            onSend={send}
            onStop={stop}
          />
        </main>
      </div>
    </div>
  )
}
