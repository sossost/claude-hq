'use client'

import type { AgentDefinition, AgentTask, AgentTaskKpi } from '@/types/events'
import { AgentCatalog } from './AgentCatalog'
import { AgentWorkspace } from './AgentWorkspace'

interface AgentPanelProps {
  agents: AgentDefinition[]
  isLoading: boolean
  agentTasks: AgentTask[]
  agentKpi: AgentTaskKpi
}

export function AgentPanel({
  agents,
  isLoading,
  agentTasks,
  agentKpi,
}: AgentPanelProps) {
  if (isLoading) {
    return (
      <div className="p-6 text-xs" style={{ color: 'var(--content-muted)' }}>
        Loading agents...
      </div>
    )
  }

  const hasAgentActivity = agentTasks.length > 0
  const projectAgentCount = agents.filter((a) => a.source === 'project').length

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Workspace: always visible when agents are active */}
      {hasAgentActivity && (
        <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <AgentWorkspace tasks={agentTasks} kpi={agentKpi} />
        </div>
      )}

      {/* Catalog: always below */}
      <div className="shrink-0">
        <div
          className="px-4 pt-4 pb-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Agents
          </h2>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--content-muted)' }}>
            {agents.length} agents
            {projectAgentCount > 0 && (
              <span> · {projectAgentCount} project</span>
            )}
          </p>
        </div>
        <AgentCatalog agents={agents} />
      </div>
    </div>
  )
}
