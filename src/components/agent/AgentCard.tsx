'use client'

import type { AgentDefinition } from '@/types/events'

interface AgentCardProps {
  agent: AgentDefinition
}

const KNOWN_MODEL_COLORS: Record<string, string> = {
  opus: 'var(--error)',
  sonnet: 'var(--warning)',
  haiku: 'var(--success)',
  inherit: 'var(--content-muted)',
}

const EXTERNAL_MODEL_COLOR = 'var(--primary)'

function getModelColor(model: string): string {
  return KNOWN_MODEL_COLORS[model] ?? EXTERNAL_MODEL_COLOR
}

function getModelLabel(model: string): string {
  if (model in KNOWN_MODEL_COLORS) {
    return model.charAt(0).toUpperCase() + model.slice(1)
  }
  return model
}

function getInitials(name: string): string {
  return name
    .split('-')
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

export function AgentCard({ agent }: AgentCardProps) {
  const color = getModelColor(agent.model)

  return (
    <div
      className="flex flex-col items-center text-center p-3 rounded-lg transition-colors"
      style={{
        background: 'var(--background)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold mb-2"
        style={{
          background: color,
          color: 'var(--primary-foreground)',
          opacity: 0.9,
        }}
      >
        {getInitials(agent.name)}
      </div>

      {/* Name */}
      <span
        className="text-[11px] font-semibold truncate w-full"
        style={{ color: 'var(--foreground)' }}
      >
        {agent.name}
      </span>

      {/* Model */}
      <span
        className="text-[9px] mt-0.5"
        style={{ color }}
      >
        {getModelLabel(agent.model)}
      </span>

      {/* Source badge for project agents */}
      {agent.source === 'project' && (
        <span
          className="text-[8px] mt-1 px-1.5 py-0.5 rounded-full"
          style={{
            background: 'var(--surface-hover)',
            color: 'var(--content-secondary)',
          }}
        >
          project
        </span>
      )}

      {/* Status */}
      <div className="flex items-center gap-1 mt-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--content-muted)' }}
        />
        <span className="text-[9px]" style={{ color: 'var(--content-muted)' }}>
          idle
        </span>
      </div>
    </div>
  )
}
