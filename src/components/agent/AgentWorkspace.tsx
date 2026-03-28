'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AgentTask, AgentTaskKpi } from '@/types/events'
import { AgentTaskCard } from './AgentTaskCard'

interface AgentWorkspaceProps {
  tasks: AgentTask[]
  kpi: AgentTaskKpi
}

export function AgentWorkspace({ tasks, kpi }: AgentWorkspaceProps) {
  const [fadedOutIds, setFadedOutIds] = useState<Set<string>>(new Set())

  // Reset fadedOutIds when task list is cleared (new session)
  const prevTasksLengthRef = useRef(tasks.length)
  useEffect(() => {
    if (tasks.length === 0 && prevTasksLengthRef.current > 0) {
      setFadedOutIds(new Set())
    }
    prevTasksLengthRef.current = tasks.length
  }, [tasks.length])

  const handleFadeComplete = useCallback((taskId: string) => {
    setFadedOutIds((prev) => new Set([...prev, taskId]))
  }, [])

  const visibleTasks = tasks.filter((t) => !fadedOutIds.has(t.id))
  const isEmpty = visibleTasks.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* KPI Bar */}
      <div
        className="px-4 py-2.5 flex items-center gap-4 text-[10px] font-medium shrink-0"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--success)' }}
          />
          <span style={{ color: 'var(--foreground)' }}>{kpi.active}</span>
          <span style={{ color: 'var(--content-muted)' }}>active</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: 'var(--content-muted)' }}>✓</span>
          <span style={{ color: 'var(--foreground)' }}>{kpi.done}</span>
          <span style={{ color: 'var(--content-muted)' }}>done</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: 'var(--error)' }}>✗</span>
          <span style={{ color: 'var(--foreground)' }}>{kpi.error}</span>
          <span style={{ color: 'var(--content-muted)' }}>err</span>
        </span>
      </div>

      {/* Grid workspace */}
      <div className="flex-1 overflow-y-auto p-4">
        {isEmpty ? (
          <div
            className="flex flex-col items-center justify-center h-full text-center gap-2"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'var(--surface-hover)' }}
            >
              ⏸
            </div>
            <p className="text-xs" style={{ color: 'var(--content-muted)' }}>
              No active agents
            </p>
            <p className="text-[10px]" style={{ color: 'var(--content-muted)' }}>
              Agents will appear here when spawned during chat
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleTasks.map((task) => (
              <AgentTaskCard
                key={task.id}
                task={task}
                onFadeComplete={handleFadeComplete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
