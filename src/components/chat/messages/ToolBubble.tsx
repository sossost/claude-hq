'use client'

import { useState } from 'react'
import type { ChatMessage } from '@/types/events'
import { TOOL_RESULT_NAME } from '@/types/events'
import { safeContent } from './safeContent'

interface ToolBubbleProps {
  message: Extract<ChatMessage, { role: 'tool' }>
}

export function ToolBubble({ message }: ToolBubbleProps) {
  const isResult = message.toolName === TOOL_RESULT_NAME
  const input = safeContent(message.input)
  const output = message.output != null ? safeContent(message.output) : null
  const isWaitingForResult = output == null && isResult === false

  // Expand while waiting for result (streaming), collapsed otherwise
  const [isOpen, setIsOpen] = useState(isWaitingForResult)

  // Tool results (→ result) are displayed inline with their parent tool call
  // When collapsed, just show tool name header as clickable
  if (isResult) {
    if (output == null || output === '') return null

    return (
      <div
        className="rounded-xl text-xs font-mono overflow-hidden"
        style={{ border: '1px solid var(--chat-tool-border)', background: 'var(--chat-tool)' }}
      >
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-2 w-full text-left"
          style={{ background: 'var(--chat-tool-header)' }}
        >
          <span
            className="transition-transform duration-200 text-[10px]"
            style={{
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              color: 'var(--content-muted)',
            }}
          >
            ▶
          </span>
          <span style={{ color: 'var(--content-muted)' }}>result</span>
          {message.isError && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--error)' }}
            />
          )}
        </button>
        {isOpen && (
          <pre
            className="px-3 py-2 whitespace-pre-wrap break-all"
            style={{
              color: message.isError ? 'var(--error)' : 'var(--content-secondary)',
              maxHeight: '20rem',
              overflowY: 'auto',
              margin: 0,
            }}
          >
            {output}
          </pre>
        )}
      </div>
    )
  }

  // Tool call (invocation)
  return (
    <div
      className="rounded-xl text-xs font-mono overflow-hidden"
      style={{ border: '1px solid var(--chat-tool-border)', background: 'var(--chat-tool)' }}
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 w-full text-left"
        style={{ background: 'var(--chat-tool-header)' }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="transition-transform duration-200"
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            color: 'var(--content-muted)',
          }}
        >
          <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-medium" style={{ color: 'var(--warning)' }}>
          {message.toolName}
        </span>
        <span className="truncate" style={{ color: 'var(--content-muted)' }}>
          {input}
        </span>
      </button>
      {isOpen && output != null && output !== '' && (
        <pre
          className="px-3 py-2 whitespace-pre-wrap break-all"
          style={{
            color: message.isError ? 'var(--error)' : 'var(--content-secondary)',
            borderTop: '1px solid var(--chat-tool-border)',
            maxHeight: '20rem',
            overflowY: 'auto',
            margin: 0,
          }}
        >
          {output}
        </pre>
      )}
    </div>
  )
}
