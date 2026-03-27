'use client'

import { useState } from 'react'
import { useChat } from '@/lib/useChat'
import { useTheme } from '@/lib/useTheme'
import { useProjects } from '@/lib/useProjects'
import { useSessions } from '@/lib/useSessions'
import { useAgents } from '@/lib/useAgents'
import { useAgentTasks } from '@/lib/useAgentTasks'
import { useClaudeConfig } from '@/lib/useClaudeConfig'
import { useSessionSettings } from '@/lib/useSessionSettings'
import { useProjectPersistence } from '@/lib/useProjectPersistence'
import { useSessionAutoSelect } from '@/lib/useSessionAutoSelect'
import { ChatPanel } from '@/components/chat'
import { ProjectList } from '@/components/project'
import { SessionList } from '@/components/session'
import { AgentPanel } from '@/components/agent'

const SIDEBAR_PANEL_COUNT = 2
const SIDEBAR_SLIDE_WIDTH = `${SIDEBAR_PANEL_COUNT * 100}%`
const AGENT_PANEL_WIDTH = '40%'
const AGENT_PANEL_MIN_WIDTH = '20rem'
const AGENT_PANEL_MAX_WIDTH = '36rem'

const IS_AGENT_PANEL_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AGENT_PANEL === 'true'

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false)

  const { settings, updateSettings } = useSessionSettings()
  const { projects, isLoading: projectsLoading, importProject, removeProject } = useProjects()
  const { toggle, theme } = useTheme()
  const claudeDefaults = useClaudeConfig()

  // Project persistence needs clear from chat, but chat needs project from persistence.
  // Break the cycle: persistence tracks selectedProject, chat consumes it.
  const {
    selectedProject,
    sidebarView,
    setSidebarView,
    handleProjectSelect,
    handleProjectRemove,
  } = useProjectPersistence({
    projects,
    onClear: () => chat.clear(),
    onRemove: removeProject,
  })

  const chat = useChat({ project: selectedProject, settings })
  const { agents, isLoading: agentsLoading } = useAgents({ projectPath: selectedProject?.path ?? null })
  const { tasks: agentTasks, kpi: agentKpi } = useAgentTasks(chat.messages, chat.isRunning)

  const {
    sessions,
    activeSessionId,
    selectSession,
    deleteSession,
    setActiveSessionId,
    refresh: refreshSessions,
  } = useSessions({ projectPath: selectedProject?.path ?? null })

  const {
    handleSessionSelect,
    handleSessionDelete,
    handleNewSession,
  } = useSessionAutoSelect({
    projectPath: selectedProject?.path ?? null,
    sessions,
    activeSessionId,
    isRunning: chat.isRunning,
    selectSession,
    loadSession: chat.loadSession,
    setActiveSessionId,
    clear: chat.clear,
    refreshSessions,
  })

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
          {chat.isRunning && (
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
          {IS_AGENT_PANEL_ENABLED && (
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
          )}
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
                width: SIDEBAR_SLIDE_WIDTH,
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
                    onDelete={(id) => handleSessionDelete(id, deleteSession)}
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
            messages={chat.messages}
            isRunning={chat.isRunning}
            hasProject={selectedProject != null}
            projectName={selectedProject?.name}
            settings={settings}
            activeModel={chat.activeModel}
            activePermissionMode={chat.activePermissionMode}
            claudeDefaults={claudeDefaults}
            onSettingsChange={updateSettings}
            onSend={chat.send}
            onStop={chat.stop}
          />
        </main>

        {IS_AGENT_PANEL_ENABLED && isAgentPanelOpen && (
          <aside
            className="shrink-0"
            style={{
              width: AGENT_PANEL_WIDTH,
              minWidth: AGENT_PANEL_MIN_WIDTH,
              maxWidth: AGENT_PANEL_MAX_WIDTH,
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
