'use client'

import { useState, useRef, useEffect } from 'react'

const TEXTAREA_MAX_HEIGHT_PX = 160

interface ChatInputProps {
  onSend: (message: string) => void
  onStop: () => void
  isRunning: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, onStop, isRunning, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const composingRef = useRef(false)

  useEffect(() => {
    if (isRunning === false) {
      textareaRef.current?.focus()
    }
  }, [isRunning])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el == null) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`
  }, [value])

  function handleSubmit() {
    const trimmed = value.trim()
    if (trimmed === '' || disabled === true) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.shiftKey === false && composingRef.current === false) {
      e.preventDefault()
      if (isRunning) return
      handleSubmit()
    }
  }

  const canSend = value.trim() !== '' && disabled !== true

  return (
    <div className="px-4 pb-4 pt-1">
      <div
        className="max-w-3xl mx-auto rounded-2xl transition-shadow"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--input-border)',
          boxShadow: '0 1px 6px var(--input-shadow), 0 0 0 0 transparent',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onCompositionStart={() => { composingRef.current = true }}
          onCompositionEnd={() => { composingRef.current = false }}
          onKeyDown={handleKeyDown}
          placeholder="Message Claude..."
          rows={1}
          className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm focus:outline-none"
          style={{ color: 'var(--foreground)', maxHeight: `${TEXTAREA_MAX_HEIGHT_PX}px` }}
        />
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-[10px]" style={{ color: 'var(--content-muted)' }}>
            Shift+Enter for new line
          </span>
          {isRunning ? (
            <button
              onClick={onStop}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ background: 'var(--error)', color: 'var(--error-foreground)' }}
              aria-label="Stop"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSend}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: canSend ? 'var(--foreground)' : 'var(--content-muted)',
                color: 'var(--background)',
              }}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 12V4M8 4L4 8M8 4L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
