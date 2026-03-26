'use client'

import type { ChatMessage } from '@/types/events'
import { safeContent } from './safeContent'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ThinkingBlock } from './ThinkingBlock'

interface AssistantBubbleProps {
  message: Extract<ChatMessage, { role: 'assistant' }>
  isStreaming?: boolean
}

export function AssistantBubble({ message, isStreaming = false }: AssistantBubbleProps) {
  const content = safeContent(message.content)
  const thinking = message.thinking

  return (
    <div className="text-sm" style={{ color: 'var(--foreground)' }}>
      {thinking != null && thinking !== '' && (
        <ThinkingBlock content={thinking} isStreaming={isStreaming} />
      )}
      <MarkdownRenderer content={content} />
    </div>
  )
}
