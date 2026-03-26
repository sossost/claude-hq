'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useChat } from '@/lib/useChat'
import { useTheme } from '@/lib/useTheme'
import { useProjects } from '@/lib/useProjects'
import { useSessions } from '@/lib/useSessions'
import { useAgents } from '@/lib/useAgents'
import { useAgentTasks } from '@/lib/useAgentTasks'
import { useClaudeConfig } from '@/lib/useClaudeConfig'
import { ChatPanel } from '@/components/chat'
import { ProjectList } from '@/components/project'
import { SessionList } from '@/components/session'
import { AgentPanel } from '@/components/agent'
import type { Project, SessionSettings } from '@/types/events'
import { DEFAULT_SESSION_SETTINGS } from '@/types/events'

type SidebarView = 'projects' | 'sessions'

export default function Dashboard() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(true)
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SESSION_SETTINGS
    try {
      const saved = localStorage.getItem('sessionSettings')
      if (saved != null) return JSON.parse(saved) as SessionSettings
    } catch {
      // Parse failure — use defaults
    }
    return DEFAULT_SESSION_SETTINGS
  })
  const [sidebarView, setSidebarView] = useState<SidebarView>('projects')
  const handleSettingsChange = useCallback((next: SessionSettings) => {
    setSessionSettings(next)
    localStorage.setItem('sessionSettings', JSON.stringify(next))
  }, [])

  const { projects, isLoading: projectsLoading, importProject, removeProject } = useProjects()
  const { messages, isRunning, activeModel, activePermissionMode, send, stop, clear, loadSession } = useChat({
    project: selectedProject,
    settings: sessionSettings,
  })
  const { toggle, theme } = useTheme()
  const claudeDefaults = useClaudeConfig()
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
  // userClearedRef prevents auto-select after explicit "New Session" click
  const userClearedRef = useRef(false)

  useEffect(() => {
    userClearedRef.current = false
  }, [selectedProject?.path])

  useEffect(() => {
    if (userClearedRef.current) return
    const currentPath = selectedProject?.path ?? null
    if (currentPath == null) return
    if (activeSessionId != null) return

    const projectSessions = sessions.filter((s) => s.projectPath === currentPath)
    const mostRecent = projectSessions.find((s) => s.messageCount > 0)
    if (mostRecent == null) return

    selectSessionRaw(mostRecent.id).then((session) => {
      if (session != null) {
        loadSession(session)
      }
    })
  }, [selectedProject?.path, sessions, activeSessionId, selectSessionRaw, loadSession])

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
    userClearedRef.current = true
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
        className="px-4 h-12 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--content-muted)' }}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Claude HQ
          </span>
          {selectedProject != null && (
            <>
              <span style={{ color: 'var(--border)' }}>/</span>
              <span className="text-sm truncate max-w-[200px]" style={{ color: 'var(--content-secondary)' }}>
                {selectedProject.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isRunning && (
            <span
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full mr-1"
              style={{ color: 'var(--success)', background: 'var(--success-muted)' }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: 'var(--success)' }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--success)' }} />
              </span>
              Running
            </span>
          )}
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--content-muted)' }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 2v1M8 13v1M2 8h1M13 8h1M3.75 3.75l.75.75M11.5 11.5l.75.75M12.25 3.75l-.75.75M4.5 11.5l-.75.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 8.5a5.5 5.5 0 0 1-6-6 5.5 5.5 0 1 0 6 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {/* Agent panel toggle */}
          <button
            onClick={() => setIsAgentPanelOpen((prev) => !prev)}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: isAgentPanelOpen ? 'var(--foreground)' : 'var(--content-muted)' }}
            aria-label="Toggle agent panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="2.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9.5" y="2.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {isSidebarOpen && (
          <aside
            className="w-60 shrink-0 overflow-hidden"
            style={{
              background: 'var(--surface)',
              borderRight: '1px solid var(--border-subtle)',
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
            projectName={selectedProject?.name}
            settings={sessionSettings}
            activeModel={activeModel}
            activePermissionMode={activePermissionMode}
            claudeDefaults={claudeDefaults}
            onSettingsChange={handleSettingsChange}
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
              borderLeft: '1px solid var(--border-subtle)',
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
