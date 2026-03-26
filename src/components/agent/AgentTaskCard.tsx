'use client'

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import type { AgentTask, AgentTaskStatus } from '@/types/events'

interface AgentTaskCardProps {
  task: AgentTask
  onFadeComplete: (taskId: string) => void
}

const FADE_DELAY_DONE_MS = 3_000
const FADE_DELAY_ERROR_MS = 5_000
const FADE_DURATION_MS = 400
const PROGRESS_BAR_WIDTH = '40%'
const PROGRESS_ANIMATION_DURATION = '1.5s'

const STATUS_CONFIG: Record<AgentTaskStatus, { color: string; label: string }> = {
  running: { color: 'var(--success)', label: 'running' },
  done: { color: 'var(--content-muted)', label: 'done' },
  error: { color: 'var(--error)', label: 'error' },
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1_000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}m ${remaining}s`
}

export function AgentTaskCard({ task, onFadeComplete }: AgentTaskCardProps) {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering')
  const config = STATUS_CONFIG[task.status]

  // Stable ref for onFadeComplete to avoid re-triggering effects
  const onFadeCompleteRef = useRef(onFadeComplete)
  useLayoutEffect(() => {
    onFadeCompleteRef.current = onFadeComplete
  }, [onFadeComplete])

  // Fade-in on mount — double rAF ensures browser has painted opacity:0 first
  useEffect(() => {
    const outer = requestAnimationFrame(() => {
      const inner = requestAnimationFrame(() => {
        setPhase('visible')
      })
      return () => cancelAnimationFrame(inner)
    })
    return () => cancelAnimationFrame(outer)
  }, [])

  // Fade-out on completion
  useEffect(() => {
    if (task.status === 'running') return

    const delay = task.status === 'error' ? FADE_DELAY_ERROR_MS : FADE_DELAY_DONE_MS
    const delayTimer = setTimeout(() => {
      setPhase('exiting')
    }, delay)

    return () => clearTimeout(delayTimer)
  }, [task.status])

  // Notify parent after fade-out animation completes
  useEffect(() => {
    if (phase !== 'exiting') return

    const timer = setTimeout(() => {
      onFadeCompleteRef.current(task.id)
    }, FADE_DURATION_MS)

    return () => clearTimeout(timer)
  }, [phase, task.id])

  const opacity = phase === 'entering' ? 0 : phase === 'exiting' ? 0 : 1

  return (
    <div
      className="relative p-3 rounded-lg transition-all group"
      style={{
        background: 'var(--background)',
        border: `1px solid ${task.status === 'error' ? 'var(--error)' : 'var(--border)'}`,
        opacity,
        transform: phase === 'entering' ? 'translateY(8px)' : 'translateY(0)',
        transitionDuration: `${FADE_DURATION_MS}ms`,
        transitionProperty: 'opacity, transform',
      }}
    >
      {/* Header: status dot + name */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="shrink-0 w-2 h-2 rounded-full"
          style={{
            background: config.color,
            boxShadow: task.status === 'running' ? `0 0 6px ${config.color}` : 'none',
          }}
        />
        <span
          className="text-xs font-semibold truncate"
          style={{ color: 'var(--foreground)' }}
        >
          {task.agentName}
        </span>
      </div>

      {/* Description */}
      <p
        className="text-[10px] truncate mb-2"
        style={{ color: 'var(--content-secondary)' }}
      >
        {task.description}
      </p>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden mb-1.5"
        style={{ background: 'var(--surface-hover)' }}
      >
        {task.status === 'running' ? (
          <div
            className="h-full rounded-full"
            style={{
              background: config.color,
              width: PROGRESS_BAR_WIDTH,
              animation: `agent-progress ${PROGRESS_ANIMATION_DURATION} ease-in-out infinite`,
            }}
          />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              background: config.color,
              width: '100%',
            }}
          />
        )}
      </div>

      {/* Footer: status + elapsed */}
      <div className="flex items-center justify-between">
        <span className="text-[9px]" style={{ color: config.color }}>
          {config.label}
        </span>
        <span className="text-[9px]" style={{ color: 'var(--content-muted)' }}>
          {formatElapsed(task.elapsedMs)}
        </span>
      </div>

      {/* Hover tooltip */}
      <div
        className="absolute left-0 right-0 bottom-full mb-1 p-2 rounded-md text-[9px] leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10"
        style={{
          background: 'var(--foreground)',
          color: 'var(--background)',
        }}
      >
        {task.subagentType != null && <div>Type: {task.subagentType}</div>}
        {task.model != null && <div>Model: {task.model}</div>}
        <div className="truncate">{task.description}</div>
      </div>
    </div>
  )
}
