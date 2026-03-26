import type { ChatMessage } from '@/types/events'

interface ToolBubbleProps {
  message: Extract<ChatMessage, { role: 'tool' }>
}

export function ToolBubble({ message }: ToolBubbleProps) {
  const isResult = message.toolName === '→ result'

  return (
    <div
      className="rounded-lg text-xs font-mono overflow-hidden"
      style={{ border: '1px solid var(--chat-tool-border)', background: 'var(--chat-tool)' }}
    >
      {!isResult && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ borderBottom: '1px solid var(--chat-tool-border)', background: 'var(--chat-tool-header)' }}
        >
          <span className="font-medium" style={{ color: 'var(--warning)' }}>{message.toolName}</span>
          <span className="truncate" style={{ color: 'var(--content-muted)' }}>{message.input}</span>
        </div>
      )}
      {message.output != null && (
        <pre
          className="px-3 py-2 whitespace-pre-wrap break-all"
          style={{ color: message.isError ? 'var(--error)' : 'var(--content-secondary)' }}
        >
          {message.output}
        </pre>
      )}
    </div>
  )
}
