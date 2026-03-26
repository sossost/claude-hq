import type { ChatMessage } from '@/types/events'

interface ToolBubbleProps {
  message: Extract<ChatMessage, { role: 'tool' }>
}

export function ToolBubble({ message }: ToolBubbleProps) {
  const isResult = message.toolName === '→ result'

  return (
    <div
      className="rounded-lg text-xs font-mono overflow-hidden"
      style={{ border: '1px solid var(--tool-border)', background: 'var(--tool-bg)' }}
    >
      {!isResult && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-header)' }}
        >
          <span className="text-amber-600 dark:text-yellow-400 font-medium">{message.toolName}</span>
          <span className="truncate" style={{ color: 'var(--text-muted)' }}>{message.input}</span>
        </div>
      )}
      {message.output != null && (
        <pre
          className={`px-3 py-2 whitespace-pre-wrap break-all ${message.isError ? 'text-red-500' : ''}`}
          style={{ color: message.isError ? undefined : 'var(--text-secondary)' }}
        >
          {message.output}
        </pre>
      )}
    </div>
  )
}
