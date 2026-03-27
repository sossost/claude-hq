import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import type { ChatMessage, SessionSettings } from '@/types/events'
import { TOOL_RESULT_NAME } from '@/types/events'

const TOOL_OUTPUT_MAX_LENGTH = 500
const TOOL_INPUT_DISPLAY_MAX_LENGTH = 200

function nextId(): string {
  return `msg-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
}

// ─── Safe field extractors for untrusted CLI JSON ──────────────

function str(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key]
  return typeof v === 'string' ? v : null
}

function num(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key]
  return typeof v === 'number' ? v : undefined
}

function bool(obj: Record<string, unknown>, key: string): boolean {
  return obj[key] === true
}

function arr(obj: Record<string, unknown>, key: string): Array<Record<string, unknown>> {
  const v = obj[key]
  return Array.isArray(v) ? v as Array<Record<string, unknown>> : []
}

function obj(parent: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = parent[key]
  if (typeof v === 'object' && v != null && Array.isArray(v) === false) {
    return v as Record<string, unknown>
  }
  return null
}

/**
 * Spawns a `claude` CLI child process and emits normalized
 * ChatMessage events parsed from the stream-json output.
 */
export class ClaudeSession extends EventEmitter {
  private proc: ChildProcess | null = null
  private sessionId: string | null = null
  private model: string | null = null
  private buffer = ''

  constructor(
    private readonly cwd: string,
    private readonly allowedTools: string[] = [],
  ) {
    super()
  }

  send(prompt: string, resumeSessionId?: string, settings?: SessionSettings) {
    const args = [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--verbose',
    ]

    if (resumeSessionId != null) {
      args.push('--resume', resumeSessionId)
    }

    if (this.allowedTools.length > 0) {
      args.push('--allowedTools', this.allowedTools.join(','))
    }

    if (settings?.model != null) {
      args.push('--model', settings.model)
    }
    if (settings?.effort != null) {
      args.push('--effort', settings.effort)
    }
    if (settings?.permissionMode != null) {
      args.push('--permission-mode', settings.permissionMode)
    }

    this.proc = spawn('claude', args, {
      cwd: this.cwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    this.buffer = ''

    this.proc.stdout?.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString()
      this.processBuffer()
    })

    this.proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text !== '') {
        this.emit('message', {
          id: nextId(),
          role: 'system',
          content: text,
          timestamp: Date.now(),
        } satisfies ChatMessage)
      }
    })

    this.proc.on('close', (code) => {
      this.processBuffer()
      this.emit('close', code)
    })

    this.proc.on('error', (err) => {
      this.emit('message', {
        id: nextId(),
        role: 'system',
        content: `Process error: ${err.message}`,
        timestamp: Date.now(),
      } satisfies ChatMessage)
    })
  }

  stop() {
    this.proc?.kill('SIGTERM')
  }

  getSessionId() {
    return this.sessionId
  }

  private processBuffer() {
    const lines = this.buffer.split('\n')
    // Last line may be incomplete — keep it in buffer
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.trim() === '') continue
      try {
        const event = JSON.parse(line)
        if (typeof event !== 'object' || event == null) continue
        const messages = this.parseEvent(event as Record<string, unknown>)
        for (const msg of messages) {
          this.emit('message', msg)
        }
      } catch {
        // Ignore JSON parse failures
      }
    }
  }

  private parseEvent(event: Record<string, unknown>): ChatMessage[] {
    const type = str(event, 'type')

    // Init event — capture sessionId, model, permissionMode and emit to UI
    if (type === 'system' && event['subtype'] === 'init') {
      this.sessionId = str(event, 'session_id')
      this.model = str(event, 'model')
      return [{
        id: nextId(),
        role: 'status',
        sessionId: this.sessionId ?? '',
        status: 'running',
        model: this.model ?? undefined,
        permissionMode: str(event, 'permissionMode') ?? undefined,
        timestamp: Date.now(),
      }]
    }

    // Hook events — skip
    if (type === 'system') {
      return []
    }

    // Rate limit events — skip
    if (type === 'rate_limit_event') {
      return []
    }

    // Assistant message — text, thinking, or tool call
    if (type === 'assistant') {
      return this.parseAssistantEvent(event)
    }

    // Tool result — execution output
    if (type === 'user') {
      return this.parseToolResultEvent(event)
    }

    // Final result — session complete
    if (type === 'result') {
      this.sessionId = str(event, 'session_id')
      return [{
        id: nextId(),
        role: 'status',
        sessionId: this.sessionId ?? '',
        status: event['subtype'] === 'success' ? 'done' : 'error',
        model: this.model ?? undefined,
        duration: num(event, 'duration_ms'),
        cost: num(event, 'total_cost_usd'),
        turns: num(event, 'num_turns'),
        timestamp: Date.now(),
      }]
    }

    return []
  }

  private parseAssistantEvent(event: Record<string, unknown>): ChatMessage[] {
    const msg = obj(event, 'message')
    if (msg == null) return []

    const content = arr(msg, 'content')
    const results: ChatMessage[] = []

    // Collect thinking text from all thinking blocks in this event
    const thinkingText = content
      .filter((block) => block['type'] === 'thinking' && typeof block['thinking'] === 'string' && block['thinking'] !== '')
      .map((block) => block['thinking'] as string)
      .join('\n') || undefined

    for (const block of content) {
      if (block['type'] === 'text') {
        const text = block['text']
        results.push({
          id: nextId(),
          role: 'assistant',
          content: typeof text === 'string' ? text : JSON.stringify(text),
          ...(thinkingText != null ? { thinking: thinkingText } : {}),
          timestamp: Date.now(),
        })
      }

      if (block['type'] === 'tool_use') {
        const toolName = str(block, 'name') ?? 'unknown'
        const toolUseId = str(block, 'id') ?? undefined
        const input = obj(block, 'input') ?? {}
        const display = str(input, 'command')
          ?? str(input, 'file_path')
          ?? str(input, 'pattern')
          ?? str(input, 'description')
          ?? JSON.stringify(input).slice(0, TOOL_INPUT_DISPLAY_MAX_LENGTH)

        results.push({
          id: nextId(),
          role: 'tool',
          toolName,
          toolUseId,
          input: display,
          output: null,
          isError: false,
          timestamp: Date.now(),
        })
      }
    }
    return results
  }

  private parseToolResultEvent(event: Record<string, unknown>): ChatMessage[] {
    const msg = obj(event, 'message')
    if (msg == null) return []

    const content = arr(msg, 'content')
    const toolResult = obj(event, 'tool_use_result')
    const results: ChatMessage[] = []

    for (const block of content) {
      if (block['type'] === 'tool_result') {
        const stdout = (toolResult != null ? str(toolResult, 'stdout') : null)
          ?? str(block, 'content')
          ?? ''
        const truncated = stdout.length > TOOL_OUTPUT_MAX_LENGTH
          ? stdout.slice(0, TOOL_OUTPUT_MAX_LENGTH) + '...'
          : stdout

        results.push({
          id: nextId(),
          role: 'tool',
          toolName: TOOL_RESULT_NAME,
          toolUseId: str(block, 'tool_use_id') ?? undefined,
          input: '',
          output: truncated,
          isError: bool(block, 'is_error'),
          timestamp: Date.now(),
        })
      }
    }
    return results
  }
}
