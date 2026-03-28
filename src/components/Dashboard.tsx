'use client'

import { useState, useCallback, useEffect } from 'react'
import { isModelOption, isEffortLevel, isPermissionMode, type Project } from '@/types/events'
import { useChat } from '@/lib/useChat'
import { useTheme } from '@/lib/useTheme'
import { useProjects } from '@/lib/useProjects'
import { useSessions } from '@/lib/useSessions'
import { useAgents } from '@/lib/useAgents'
import { useCommands } from '@/lib/useCommands'
import { useAgentTasks } from '@/lib/useAgentTasks'
import { useClaudeConfig } from '@/lib/useClaudeConfig'
import { useSessionSettings } from '@/lib/useSessionSettings'
import { useProjectPersistence } from '@/lib/useProjectPersistence'
import { useSessionAutoSelect } from '@/lib/useSessionAutoSelect'
import { useIsMobile, getIsMobile } from '@/lib/useIsMobile'
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
  const isMobile = useIsMobile()
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => getIsMobile() === false)
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false)

  // Sync sidebar state on breakpoint change: open on desktop, closed on mobile
  useEffect(() => {
    setIsSidebarOpen(isMobile === false)
  }, [isMobile])

  // Body scroll lock when mobile overlay is open
  const isMobileOverlayOpen = isMobile && (isSidebarOpen || isAgentPanelOpen)
  useEffect(() => {
    if (isMobileOverlayOpen === false) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [isMobileOverlayOpen])

  // Escape key to close mobile overlays
  useEffect(() => {
    if (isMobileOverlayOpen === false) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false)
        setIsAgentPanelOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMobileOverlayOpen])

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

  const {
    sessions,
    activeSessionId,
    selectSession,
    deleteSession,
    setActiveSessionId,
    refresh: refreshSessions,
  } = useSessions({ projectPath: selectedProject?.path ?? null })

  const handleSessionCreated = useCallback((newSessionId: string) => {
    setActiveSessionId(newSessionId)
    refreshSessions()
  }, [setActiveSessionId, refreshSessions])

  const chat = useChat({ project: selectedProject, settings, onSessionCreated: handleSessionCreated })
  const { agents, isLoading: agentsLoading } = useAgents({ projectPath: selectedProject?.path ?? null })
  const { commands } = useCommands({ projectPath: selectedProject?.path ?? null })
  const { tasks: agentTasks, kpi: agentKpi } = useAgentTasks(chat.messages, chat.isRunning)

  const {
    handleSessionSelect: baseSessionSelect,
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

  const handleSessionSelect = useCallback((id: string) => {
    baseSessionSelect(id)
    if (isMobile) setIsSidebarOpen(false)
  }, [baseSessionSelect, isMobile])

  const handleProjectSelectWrapped = useCallback((project: Project) => {
    handleProjectSelect(project)
    // Don't close on project select — user still needs to pick a session
  }, [handleProjectSelect])

  const handleBuiltinCommand = useCallback((name: string, args: string) => {
    const arg = args.trim()
    switch (name) {
      case 'clear':
        chat.clearMessages()
        break
      case 'new':
        handleNewSession()
        break
      case 'model':
        if (isModelOption(arg)) {
          updateSettings({ ...settings, model: arg })
        }
        break
      case 'effort':
        if (isEffortLevel(arg)) {
          updateSettings({ ...settings, effort: arg })
        }
        break
      case 'permission':
        if (isPermissionMode(arg)) {
          updateSettings({ ...settings, permissionMode: arg })
        }
        break
      default:
        break
    }
  }, [settings, updateSettings, chat.clearMessages, handleNewSession])

  const sidebarContent = (
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
          onSelect={handleProjectSelectWrapped}
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
  )

  return (
    <div className="flex flex-col" style={{ background: 'var(--background)', height: '100dvh' }}>
      <header
        className="px-3 md:px-4 h-12 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => {
              setIsSidebarOpen((prev) => !prev)
              if (isMobile) setIsAgentPanelOpen(false)
            }}
            className="p-1.5 rounded-lg transition-colors hover:opacity-80 shrink-0"
            style={{ color: 'var(--content-muted)' }}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-semibold tracking-tight shrink-0 hidden sm:inline" style={{ color: 'var(--foreground)' }}>
            Claude HQ
          </span>
          {selectedProject != null && (
            <>
              <span className="hidden sm:inline" style={{ color: 'var(--border)' }}>/</span>
              <span className="text-sm truncate max-w-[120px] sm:max-w-[200px]" style={{ color: isMobile ? 'var(--foreground)' : 'var(--content-secondary)' }}>
                {selectedProject.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {chat.isRunning && (
            <span
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full mr-1"
              style={{ color: 'var(--success)', background: 'var(--success-muted)' }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: 'var(--success)' }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--success)' }} />
              </span>
              <span className="hidden sm:inline">Running</span>
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
              onClick={() => {
                setIsAgentPanelOpen((prev) => !prev)
                if (isMobile) setIsSidebarOpen(false)
              }}
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
        {/* Desktop sidebar */}
        {isSidebarOpen && isMobile === false && (
          <aside
            className="w-60 shrink-0 overflow-hidden"
            style={{
              background: 'var(--surface)',
              borderRight: '1px solid var(--border-subtle)',
            }}
          >
            {sidebarContent}
          </aside>
        )}

        {/* Mobile sidebar overlay */}
        {isSidebarOpen && isMobile && (
          <div
            className="fixed inset-0 z-40"
            role="dialog"
            aria-modal="true"
            aria-label="Sidebar navigation"
            style={{ animation: 'fade-in 150ms ease-out' }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'var(--overlay)' }}
              onClick={() => setIsSidebarOpen(false)}
            />
            <aside
              className="relative h-full overflow-hidden"
              style={{
                width: 'min(18rem, 85vw)',
                background: 'var(--surface)',
                borderRight: '1px solid var(--border-subtle)',
                animation: 'slide-in-left 200ms ease-out',
                overscrollBehavior: 'contain',
              }}
            >
              {sidebarContent}
            </aside>
          </div>
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
            onBuiltinCommand={handleBuiltinCommand}
            commands={commands}
          />
        </main>

        {/* Desktop agent panel */}
        {IS_AGENT_PANEL_ENABLED && isAgentPanelOpen && isMobile === false && (
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

        {/* Mobile agent panel overlay */}
        {IS_AGENT_PANEL_ENABLED && isAgentPanelOpen && isMobile && (
          <div
            className="fixed inset-0 z-40"
            role="dialog"
            aria-modal="true"
            aria-label="Agent panel"
            style={{ animation: 'fade-in 150ms ease-out' }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'var(--overlay)' }}
              onClick={() => setIsAgentPanelOpen(false)}
            />
            <aside
              className="absolute inset-y-0 right-0 w-full overflow-hidden flex flex-col"
              style={{
                maxWidth: 'min(24rem, 100vw)',
                background: 'var(--surface)',
                borderLeft: '1px solid var(--border-subtle)',
                animation: 'fade-in 200ms ease-out',
                overscrollBehavior: 'contain',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-2.5 shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Agents</span>
                <button
                  onClick={() => setIsAgentPanelOpen(false)}
                  className="p-1.5 rounded-lg"
                  style={{ color: 'var(--content-muted)' }}
                  aria-label="Close agent panel"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
                <AgentPanel
                  agents={agents}
                  isLoading={agentsLoading}
                  agentTasks={agentTasks}
                  agentKpi={agentKpi}
                />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
