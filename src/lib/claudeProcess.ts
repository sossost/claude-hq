import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import type { ChatMessage } from '@/types/events'

let counter = 0
function nextId() {
  return `msg-${Date.now()}-${++counter}`
}

/**
 * Spawns a `claude` CLI child process and emits normalized
 * ChatMessage events parsed from the stream-json output.
 */
export class ClaudeSession extends EventEmitter {
  private proc: ChildProcess | null = null
  private sessionId: string | null = null
  private buffer = ''

  constructor(
    private readonly cwd: string,
    private readonly allowedTools: string[] = [],
  ) {
    super()
  }

  send(prompt: string, resumeSessionId?: string) {
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
        const messages = this.parseEvent(event)
        for (const msg of messages) {
          this.emit('message', msg)
        }
      } catch {
        // Ignore JSON parse failures
      }
    }
  }

  private parseEvent(event: Record<string, unknown>): ChatMessage[] {
    const type = event['type'] as string

    // Init event — capture sessionId only, don't emit to UI
    if (type === 'system' && event['subtype'] === 'init') {
      this.sessionId = event['session_id'] as string
      return []
    }

    // Hook events — skip
    if (type === 'system') {
      return []
    }

    // Rate limit events — skip
    if (type === 'rate_limit_event') {
      return []
    }

    // Assistant message — text or tool call
    if (type === 'assistant') {
      const msg = event['message'] as Record<string, unknown>
      const content = msg['content'] as Array<Record<string, unknown>>
      const results: ChatMessage[] = []

      for (const block of content) {
        if (block['type'] === 'text') {
          results.push({
            id: nextId(),
            role: 'assistant',
            content: block['text'] as string,
            timestamp: Date.now(),
          })
        }

        if (block['type'] === 'tool_use') {
          const input = block['input'] as Record<string, unknown>
          const display = input['command'] as string
            ?? input['file_path'] as string
            ?? input['pattern'] as string
            ?? input['description'] as string
            ?? JSON.stringify(input).slice(0, 200)

          results.push({
            id: nextId(),
            role: 'tool',
            toolName: block['name'] as string,
            input: display,
            output: null,
            isError: false,
            timestamp: Date.now(),
          })
        }
      }
      return results
    }

    // Tool result — execution output
    if (type === 'user') {
      const msg = event['message'] as Record<string, unknown>
      const content = msg['content'] as Array<Record<string, unknown>>
      const toolResult = event['tool_use_result'] as Record<string, unknown> | undefined
      const results: ChatMessage[] = []

      for (const block of content) {
        if (block['type'] === 'tool_result') {
          const stdout = toolResult?.['stdout'] as string ?? block['content'] as string ?? ''
          const truncated = stdout.length > 500 ? stdout.slice(0, 500) + '...' : stdout
          results.push({
            id: nextId(),
            role: 'tool',
            toolName: '→ result',
            input: '',
            output: truncated,
            isError: block['is_error'] as boolean,
            timestamp: Date.now(),
          })
        }
      }
      return results
    }

    // Final result — session complete
    if (type === 'result') {
      this.sessionId = event['session_id'] as string
      return [{
        id: nextId(),
        role: 'status',
        sessionId: this.sessionId,
        status: event['subtype'] === 'success' ? 'done' : 'error',
        duration: event['duration_ms'] as number,
        cost: event['total_cost_usd'] as number,
        turns: event['num_turns'] as number,
        timestamp: Date.now(),
      }]
    }

    return []
  }
}
