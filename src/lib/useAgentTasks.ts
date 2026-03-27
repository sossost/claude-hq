'use client'

import { useState, useEffect, useMemo } from 'react'
import type { ChatMessage, AgentTask, AgentTaskKpi, ToolMessage } from '@/types/events'
import { TOOL_RESULT_NAME, AGENT_TOOL_NAME } from '@/types/events'
const DESCRIPTION_MAX_LENGTH = 60
const TIMER_INTERVAL_MS = 1_000

interface AgentStartInfo {
  toolUseId: string
  agentName: string
  description: string
  model?: string
  subagentType?: string
  startedAt: number
}

function isToolMessage(msg: ChatMessage): msg is ToolMessage {
  return msg.role === 'tool'
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function extractAgentInfo(msg: ToolMessage): AgentStartInfo | null {
  if (msg.toolName !== AGENT_TOOL_NAME) return null
  if (msg.toolUseId == null) return null

  const description = msg.input

  return {
    toolUseId: msg.toolUseId,
    agentName: description !== '' ? description : 'Agent',
    description: truncate(description, DESCRIPTION_MAX_LENGTH),
    startedAt: msg.timestamp,
  }
}

function deriveTasksFromMessages(
  messages: ChatMessage[],
  isRunning: boolean,
): { tasks: AgentTask[]; kpi: AgentTaskKpi } {
  const startMap = new Map<string, AgentStartInfo>()
  const completionMap = new Map<string, { isError: boolean; timestamp: number }>()

  for (const msg of messages) {
    if (isToolMessage(msg) === false) continue
    if (msg.toolUseId == null) continue

    if (msg.toolName === AGENT_TOOL_NAME) {
      const info = extractAgentInfo(msg)
      if (info != null) {
        startMap.set(msg.toolUseId, info)
      }
    }

    if (msg.toolName === TOOL_RESULT_NAME && startMap.has(msg.toolUseId)) {
      completionMap.set(msg.toolUseId, {
        isError: msg.isError,
        timestamp: msg.timestamp,
      })
    }
  }

  const now = Date.now()
  let active = 0
  let done = 0
  let error = 0

  const tasks: AgentTask[] = []
  for (const [toolUseId, info] of startMap) {
    const completion = completionMap.get(toolUseId)

    if (completion != null) {
      const status = completion.isError ? 'error' : 'done'
      if (status === 'error') error++
      else done++

      tasks.push({
        id: toolUseId,
        agentName: info.agentName,
        description: info.description,
        status,
        model: info.model,
        subagentType: info.subagentType,
        startedAt: info.startedAt,
        completedAt: completion.timestamp,
        elapsedMs: completion.timestamp - info.startedAt,
      })
    } else {
      // No completion — running if session active, error if session ended
      const status = isRunning ? 'running' : 'error'
      if (status === 'running') active++
      else error++

      tasks.push({
        id: toolUseId,
        agentName: info.agentName,
        description: info.description,
        status,
        model: info.model,
        subagentType: info.subagentType,
        startedAt: info.startedAt,
        elapsedMs: now - info.startedAt,
      })
    }
  }

  return { tasks, kpi: { active, done, error } }
}

interface UseAgentTasksReturn {
  tasks: AgentTask[]
  kpi: AgentTaskKpi
  hasActiveTasks: boolean
}

export function useAgentTasks(
  messages: ChatMessage[],
  isRunning: boolean,
): UseAgentTasksReturn {
  const [tick, setTick] = useState(0)

  // tick is intentionally included to recompute elapsedMs for running tasks
  // every TIMER_INTERVAL_MS. deriveTasksFromMessages uses Date.now() internally,
  // so the tick forces a fresh computation of elapsed time.
  const { tasks, kpi } = useMemo(
    () => deriveTasksFromMessages(messages, isRunning),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, isRunning, tick],
  )

  const hasActiveTasks = kpi.active > 0

  // Timer to update elapsed time for running tasks
  useEffect(() => {
    if (hasActiveTasks === false) return

    const interval = setInterval(() => {
      setTick((prev) => prev + 1)
    }, TIMER_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [hasActiveTasks])

  // Reset tick when session is cleared (messages emptied)
  useEffect(() => {
    if (messages.length === 0) {
      setTick(0)
    }
  }, [messages.length])

  return { tasks, kpi, hasActiveTasks }
}
