'use client'

import type { AgentDefinition, AgentCategory } from '@/types/events'
import { AgentCard } from './AgentCard'

interface AgentPanelProps {
  agents: AgentDefinition[]
  isLoading: boolean
}

const CATEGORY_CONFIG: Record<AgentCategory, { label: string }> = {
  planning: { label: 'Planning & Design' },
  quality: { label: 'Code Quality' },
  build: { label: 'Build & Test' },
  maintenance: { label: 'Maintenance' },
  exploration: { label: 'Exploration' },
}

const CATEGORY_ORDER: AgentCategory[] = ['planning', 'quality', 'build', 'maintenance', 'exploration']

function groupByCategory(agents: AgentDefinition[]): Map<AgentCategory, AgentDefinition[]> {
  const groups = new Map<AgentCategory, AgentDefinition[]>()
  for (const agent of agents) {
    const existing = groups.get(agent.category) ?? []
    groups.set(agent.category, [...existing, agent])
  }
  return groups
}

export function AgentPanel({ agents, isLoading }: AgentPanelProps) {
  if (isLoading) {
    return (
      <div className="p-6 text-xs" style={{ color: 'var(--content-muted)' }}>
        Loading agents...
      </div>
    )
  }

  const grouped = groupByCategory(agents)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Agents
        </h2>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--content-muted)' }}>
          {agents.length} agents
          {agents.some((a) => a.source === 'project') && (
            <span> · {agents.filter((a) => a.source === 'project').length} project</span>
          )}
        </p>
      </div>

      {/* Category groups */}
      <div className="flex-1 p-4 flex flex-col gap-5">
        {CATEGORY_ORDER.map((category) => {
          const group = grouped.get(category)
          if (group == null || group.length === 0) return null
          const config = CATEGORY_CONFIG[category]

          return (
            <section key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--content-muted)' }}
                >
                  {config.label}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {group.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {agents.length === 0 && (
        <div className="px-4 py-12 text-center text-xs" style={{ color: 'var(--content-muted)' }}>
          No agents found
        </div>
      )}
    </div>
  )
}
