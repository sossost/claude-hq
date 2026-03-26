'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useChat } from '@/lib/useChat'
import { useTheme } from '@/lib/useTheme'
import { useProjects } from '@/lib/useProjects'
import { useSessions } from '@/lib/useSessions'
import { useAgents } from '@/lib/useAgents'
import { useAgentTasks } from '@/lib/useAgentTasks'
import { ChatPanel } from '@/components/chat'
import { ProjectList } from '@/components/project'
import { SessionList } from '@/components/session'
import { AgentPanel } from '@/components/agent'
import type { Project } from '@/types/events'

type SidebarView = 'projects' | 'sessions'

export default function Dashboard() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(true)
  const [sidebarView, setSidebarView] = useState<SidebarView>('projects')
  const { projects, isLoading: projectsLoading, importProject, removeProject } = useProjects()
  const { messages, isRunning, send, stop, clear, loadSession } = useChat({
    project: selectedProject,
  })
  const { toggle, theme } = useTheme()
  const { agents, isLoading: agentsLoading } = useAgents({ projectPath: selectedProject?.path ?? null })
  const { tasks: agentTasks, kpi: agentKpi } = useAgentTasks(messages, isRunning)
  const {
    sessions,
    activeSessionId,
    createSession: createSessionRaw,
    selectSession: selectSessionRaw,
    deleteSession: deleteSessionRaw,
    setActiveSessionId,
    refresh: refreshSessions,
  } = useSessions({ projectPath: selectedProject?.path ?? null })

  // Restore last used project
  useEffect(() => {
    if (projects.length === 0) return

    const lastPath = localStorage.getItem('lastProjectPath')
    if (lastPath != null) {
      const found = projects.find((p) => p.path === lastPath)
      if (found != null) {
        setSelectedProject(found)
        setSidebarView('sessions')
        return
      }
    }

    setSelectedProject(projects[0])
    setSidebarView('sessions')
  }, [projects])

  // Auto-select most recent session when project changes
  // Track previous project to only fire on actual project change
  const prevProjectPathRef = useRef<string | null>(null)
  useEffect(() => {
    const currentPath = selectedProject?.path ?? null
    if (currentPath === prevProjectPathRef.current) return
    prevProjectPathRef.current = currentPath

    if (sessions.length === 0) {
      clear()
      return
    }

    const mostRecent = sessions.find((s) => s.messageCount > 0)
    if (mostRecent == null) return

    selectSessionRaw(mostRecent.id).then((session) => {
      if (session != null) {
        loadSession(session)
      }
    })
  }, [selectedProject?.path, sessions, selectSessionRaw, loadSession, clear])

  const handleProjectSelect = useCallback((project: Project) => {
    const isSameProject = project.path === selectedProject?.path
    if (!isSameProject) {
      setSelectedProject(project)
      localStorage.setItem('lastProjectPath', project.path)
      clear()
    }
    setSidebarView('sessions')
  }, [selectedProject?.path, clear])

  const handleProjectRemove = useCallback(async (path: string) => {
    await removeProject(path)
    if (selectedProject?.path === path) {
      setSelectedProject(null)
      setSidebarView('projects')
      clear()
    }
  }, [selectedProject?.path, removeProject, clear])

  const handleSessionSelect = useCallback(async (id: string) => {
    if (id === activeSessionId) return
    const session = await selectSessionRaw(id)
    if (session != null) {
      loadSession(session)
    }
  }, [activeSessionId, selectSessionRaw, loadSession])

  const handleSessionDelete = useCallback(async (id: string) => {
    await deleteSessionRaw(id)
    if (id === activeSessionId) {
      clear()
    }
  }, [activeSessionId, deleteSessionRaw, clear])

  const handleNewSession = useCallback(() => {
    clear()
    setActiveSessionId(null)
  }, [clear, setActiveSessionId])

  // Refresh session list after chat completes (title may have updated)
  const wasRunningRef = useRef(false)
  useEffect(() => {
    if (wasRunningRef.current && !isRunning) {
      refreshSessions()
    }
    wasRunningRef.current = isRunning
  }, [isRunning, refreshSessions])

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
            onClick={() => setIsAgentPanelOpen((prev) => !prev)}
            className="text-xs transition-colors"
            style={{ color: isAgentPanelOpen ? 'var(--foreground)' : 'var(--content-muted)' }}
            aria-label="Toggle agent panel"
          >
            Agents
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
            <div
              className="flex h-full transition-transform duration-200 ease-in-out"
              style={{
                width: '200%',
                transform: sidebarView === 'sessions' ? 'translateX(-50%)' : 'translateX(0)',
              }}
            >
              <div className="w-1/2 h-full overflow-y-auto">
                <ProjectList
                  projects={projects}
                  selected={selectedProject}
                  onSelect={handleProjectSelect}
                  onImport={importProject}
                  onRemove={handleProjectRemove}
                  isLoading={projectsLoading}
                />
              </div>
              <div className="w-1/2 h-full">
                {selectedProject != null && (
                  <SessionList
                    projectName={selectedProject.name}
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSelect={handleSessionSelect}
                    onDelete={handleSessionDelete}
                    onNewSession={handleNewSession}
                    onBack={() => setSidebarView('projects')}
                  />
                )}
              </div>
            </div>
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

        {isAgentPanelOpen && (
          <aside
            className="shrink-0"
            style={{
              width: '40%',
              minWidth: '20rem',
              maxWidth: '36rem',
              borderLeft: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <AgentPanel
              agents={agents}
              isLoading={agentsLoading}
              agentTasks={agentTasks}
              agentKpi={agentKpi}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
