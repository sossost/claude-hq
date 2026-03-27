'use client'

import type { SessionSummary } from '@/types/events'
import { SessionItem } from './SessionItem'

interface SessionListProps {
  projectName: string
  sessions: SessionSummary[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNewSession: () => void
  onBack: () => void
}

export function SessionList({
  projectName,
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onNewSession,
  onBack,
}: SessionListProps) {
  return (
    <div className="flex flex-col h-full">
      <div
        className="px-3 pt-3 pb-2 flex items-center gap-1.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="shrink-0 p-1 rounded-md transition-colors"
          style={{ color: 'var(--content-muted)' }}
          aria-label="Back to projects"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span
          className="text-xs font-medium truncate"
          style={{ color: 'var(--foreground)' }}
        >
          {projectName}
        </span>
        <div className="flex-1" />
        <button
          onClick={onNewSession}
          className="text-[10px] font-medium shrink-0 transition-colors"
          style={{ color: 'var(--content-muted)' }}
          aria-label="New session"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-1">
        {sessions.length === 0 && (
          <div
            className="px-3 py-8 text-center text-[10px]"
            style={{ color: 'var(--content-muted)' }}
          >
            No sessions yet
          </div>
        )}
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            title={session.title}
            messageCount={session.messageCount}
            updatedAt={session.updatedAt}
            isActive={activeSessionId === session.id}
            onSelect={() => onSelect(session.id)}
            onDelete={() => onDelete(session.id)}
          />
        ))}
      </div>
    </div>
  )
}
