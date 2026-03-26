'use client'

import { useState, useEffect } from 'react'

interface ThinkingBlockProps {
  content: string
  isStreaming?: boolean
}

export function ThinkingBlock({ content, isStreaming = false }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Auto-expand while streaming, auto-collapse when done
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
      className="rounded-lg mb-3 overflow-hidden text-xs"
      style={{ border: '1px solid var(--border)' }}
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-left transition-colors"
        style={{
          background: 'var(--surface)',
          color: 'var(--content-muted)',
        }}
      >
        <span
          className="transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>
        <span>{isStreaming ? 'Thinking...' : 'Thinking'}</span>
      </button>

      {isOpen && (
        <div
          className="px-3 py-2 whitespace-pre-wrap font-mono leading-relaxed"
          style={{
            color: 'var(--content-muted)',
            maxHeight: '20rem',
            overflowY: 'auto',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
