'use client'

import { useState, useRef, useEffect } from 'react'
import type { CommandDefinition, SendOptions } from '@/types/events'
import { useCommandPicker } from '@/lib/useCommandPicker'
import { CommandPicker } from './CommandPicker'

const TEXTAREA_MAX_HEIGHT_PX = 160
const COMMAND_PREFIX = '/'

interface ChatInputProps {
  onSend: (message: string, options?: SendOptions) => void
  onStop: () => void
  onBuiltinCommand: (name: string, args: string) => void
  isRunning: boolean
  disabled?: boolean
  commands: CommandDefinition[]
}

export function ChatInput({ onSend, onStop, onBuiltinCommand, isRunning, disabled, commands }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const picker = useCommandPicker({
    commands,
    value,
    isComposing,
    onSend,
    onBuiltinCommand,
    setValue,
  })

  // Close picker on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current == null) return
      if (containerRef.current.contains(e.target as Node) === false) {
        picker.setIsPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [picker])

  // Refocus on idle (skip on touch devices to avoid virtual keyboard popup)
  useEffect(() => {
    if (isRunning === false && window.matchMedia('(hover: hover)').matches) {
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

    // Try command first
    if (picker.handleCommandSubmit()) return

    onSend(trimmed)
    setValue('')
    picker.setIsPickerOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (isComposing) return

    // Let picker handle first
    if (picker.handleKeyDown(e)) return

    // Normal submit
    if (e.key === 'Enter' && e.shiftKey === false) {
      e.preventDefault()
      if (isRunning) return
      handleSubmit()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value
    setValue(newValue)

    if (newValue.startsWith(COMMAND_PREFIX) && isComposing === false) {
      picker.setIsPickerOpen(true)
    } else {
      picker.setIsPickerOpen(false)
    }
  }

  const canSend = value.trim() !== '' && disabled !== true

  return (
    <div className="px-2 sm:px-4 pb-4 pt-1 relative" ref={containerRef}>
      {picker.shouldShowPicker && (
        <CommandPicker
          items={picker.pickerItems}
          selectedIndex={picker.selectedIndex}
          onSelect={picker.handlePickerSelect}
          isSubOption={picker.isSubOptionMode}
        />
      )}
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
          onChange={handleChange}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={handleKeyDown}
          placeholder="Message Claude..."
          rows={1}
          className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm focus:outline-none"
          style={{ color: 'var(--foreground)', maxHeight: `${TEXTAREA_MAX_HEIGHT_PX}px` }}
          aria-label="Chat message"
          aria-expanded={picker.shouldShowPicker}
          aria-haspopup="listbox"
        />
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-[10px]" style={{ color: 'var(--content-muted)' }}>
            {picker.shouldShowPicker ? '↑↓ navigate · → complete · Enter select · Esc close' : 'Shift+Enter for new line'}
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
              disabled={canSend === false}
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
