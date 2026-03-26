'use client'

import { useChat } from '@/lib/useChat'
import { useTheme } from '@/lib/useTheme'
import { ChatPanel } from '@/components/chat'

export default function Dashboard() {
  const { messages, isRunning, send, stop, clear } = useChat({
    project: null,
  })
  const { toggle, theme } = useTheme()

  function handleNewSession() {
    clear()
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <header
        className="px-6 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Claude HQ
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 text-xs text-green-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              Running
            </span>
          )}
          <button
            onClick={toggle}
            className="text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={handleNewSession}
            className="text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            New Session
          </button>
        </div>
      </header>

      <ChatPanel
        messages={messages}
        isRunning={isRunning}
        hasProject={false}
        onSend={send}
        onStop={stop}
      />
    </div>
  )
}
