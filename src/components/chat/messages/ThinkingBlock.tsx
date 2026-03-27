'use client'

import { useState, useEffect } from 'react'

const THINKING_MAX_HEIGHT = '20rem'

interface ThinkingBlockProps {
  content: string
  isStreaming?: boolean
}

export function ThinkingBlock({ content, isStreaming = false }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [isStreaming])

  if (content === '') return null

  return (
    <div
      className="rounded-xl mb-3 overflow-hidden text-xs"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-left transition-colors"
        style={{ color: 'var(--content-muted)' }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{isStreaming ? 'Thinking...' : 'Thinking'}</span>
      </button>

      {isOpen && (
        <div
          className="px-3 py-2 whitespace-pre-wrap font-mono leading-relaxed"
          style={{
            color: 'var(--content-muted)',
            borderTop: '1px solid var(--border-subtle)',
            maxHeight: THINKING_MAX_HEIGHT,
            overflowY: 'auto',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
