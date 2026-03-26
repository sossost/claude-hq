'use client'

import { useState, useRef, useEffect } from 'react'

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
    if (!isRunning) {
      textareaRef.current?.focus()
    }
  }, [isRunning])

  function handleSubmit() {
    const trimmed = value.trim()
    if (trimmed === '' || disabled === true) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
      e.preventDefault()
      if (isRunning) return
      handleSubmit()
    }
  }

  return (
    <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex gap-2 items-end max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onCompositionStart={() => { composingRef.current = true }}
          onCompositionEnd={() => { composingRef.current = false }}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          rows={1}
          className="flex-1 resize-none rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors"
          style={{
            background: 'var(--input)',
            border: '1px solid var(--input-border)',
            color: 'var(--foreground)',
          }}
        />
        {isRunning ? (
          <button
            onClick={onStop}
            className="shrink-0 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            style={{ background: 'var(--error)', color: 'var(--error-foreground)' }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={value.trim() === '' || disabled === true}
            className="shrink-0 rounded-lg px-4 py-3 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
