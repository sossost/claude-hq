'use client'

import { useState } from 'react'
import type { ChatMessage } from '@/types/events'
import { TOOL_RESULT_NAME } from '@/types/events'
import { safeContent } from './safeContent'

interface ToolBubbleProps {
  message: Extract<ChatMessage, { role: 'tool' }>
}

const TOOL_ICONS: Record<string, string> = {
  Read: '📄',
  Write: '✏️',
  Edit: '✏️',
  Bash: '⚡',
  Glob: '🔍',
  Grep: '🔍',
  Agent: '🤖',
  WebFetch: '🌐',
  WebSearch: '🌐',
  TodoWrite: '📋',
  TaskCreate: '📋',
  TaskUpdate: '📋',
}

function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] ?? '🔧'
}

function formatToolSummary(toolName: string, input: string): string {
  // Show a meaningful one-line summary based on tool type
  const trimmed = input.trim()
  if (trimmed === '') return toolName

  // For file operations, show the path
  // For Bash, show the command
  // For others, truncate the input
  return trimmed
}

export function ToolBubble({ message }: ToolBubbleProps) {
  const isResult = message.toolName === TOOL_RESULT_NAME
  const input = safeContent(message.input)
  const output = message.output != null ? safeContent(message.output) : null
  const isWaitingForResult = output == null && isResult === false

  const [isOpen, setIsOpen] = useState(false)

  // Tool results: show nothing if empty, compact error/output on click
  if (isResult) {
    if (output == null || output === '') return null

    // Error results are always visible
    if (message.isError) {
      return (
        <div className="flex items-start gap-2 pl-5">
          <pre
            className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed"
            style={{ color: 'var(--error)', margin: 0 }}
          >
            {output.length > 500 ? `${output.slice(0, 500)}…` : output}
          </pre>
        </div>
      )
    }

    // Non-error results: hidden by default, clickable to expand
    return null
  }

  // Tool call: compact log line
  const icon = getToolIcon(message.toolName)
  const summary = formatToolSummary(message.toolName, input)
  const hasOutput = output != null && output !== ''
  const isDone = output != null
  const hasError = message.isError

  return (
    <div>
      <button
        onClick={() => hasOutput && setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs py-0.5 w-full text-left group"
        style={{ cursor: hasOutput ? 'pointer' : 'default' }}
        aria-expanded={hasOutput ? isOpen : undefined}
        aria-label={`${message.toolName}: ${summary}`}
      >
        <span className="shrink-0 text-[11px]">{icon}</span>
        <span className="font-medium shrink-0" style={{ color: 'var(--content-muted)' }}>
          {message.toolName}
        </span>
        <span
          className="truncate"
          style={{ color: 'var(--content-muted)', opacity: 0.7 }}
        >
          {summary}
        </span>
        <span className="shrink-0 ml-auto">
          {isWaitingForResult && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--warning)' }}
            />
          )}
          {isDone && hasError === false && (
            <span style={{ color: 'var(--success)', fontSize: '11px' }}>✓</span>
          )}
          {hasError && (
            <span style={{ color: 'var(--error)', fontSize: '11px' }}>✗</span>
          )}
        </span>
        {hasOutput && (
          <span
            className="shrink-0 text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"
            style={{ color: 'var(--content-muted)' }}
          >
            {isOpen ? '▼' : '▶'}
          </span>
        )}
      </button>
      {isOpen && hasOutput && (
        <pre
          className="ml-5 mt-1 px-3 py-2 rounded-lg text-xs font-mono whitespace-pre-wrap break-all"
          style={{
            color: 'var(--content-secondary)',
            background: 'var(--surface)',
            maxHeight: '20rem',
            overflowY: 'auto',
            margin: '0.25rem 0 0.25rem 1.25rem',
            overscrollBehavior: 'contain',
          }}
        >
          {output}
        </pre>
      )}
    </div>
  )
}
