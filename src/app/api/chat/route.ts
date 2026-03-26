import { NextRequest, NextResponse } from 'next/server'
import { ClaudeSession } from '@/lib/claudeProcess'
import { appendMessages } from '@/lib/sessionStore'
import { assertSafePath, PathValidationError } from '@/lib/pathValidator'
import type { ChatMessage, SessionSettings, ModelOption, EffortLevel, PermissionMode } from '@/types/events'

const VALID_MODELS = new Set<ModelOption>(['opus', 'sonnet', 'haiku'])
const VALID_EFFORTS = new Set<EffortLevel>(['low', 'medium', 'high', 'max'])
const VALID_PERMISSIONS = new Set<PermissionMode>(['default', 'auto', 'plan'])

function validateSettings(raw: unknown): SessionSettings | undefined {
  if (typeof raw !== 'object' || raw == null) return undefined
  const obj = raw as Record<string, unknown>
  return {
    model: typeof obj.model === 'string' && VALID_MODELS.has(obj.model as ModelOption) ? obj.model as ModelOption : null,
    effort: typeof obj.effort === 'string' && VALID_EFFORTS.has(obj.effort as EffortLevel) ? obj.effort as EffortLevel : null,
    permissionMode: typeof obj.permissionMode === 'string' && VALID_PERMISSIONS.has(obj.permissionMode as PermissionMode) ? obj.permissionMode as PermissionMode : null,
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/chat
 * body: { prompt, cwd, claudeSessionId?, persistSessionId? }
 *
 * Spawns a claude CLI process and streams ChatMessage events via SSE.
 * If persistSessionId is provided, messages are also saved to disk.
 */
export async function POST(request: NextRequest) {
  const body = await request.json()

  const prompt: unknown = body.prompt
  if (typeof prompt !== 'string' || prompt.trim() === '') {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  const rawCwd: unknown = body.cwd
  if (typeof rawCwd !== 'string' || rawCwd === '') {
    return NextResponse.json({ error: 'cwd is required' }, { status: 400 })
  }

  let cwd: string
  try {
    cwd = assertSafePath(rawCwd)
  } catch (err) {
    if (err instanceof PathValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const rawSessionId = body.claudeSessionId
  const claudeSessionId = typeof rawSessionId === 'string' && UUID_RE.test(rawSessionId) ? rawSessionId : undefined
  const persistSessionId = body.persistSessionId as string | undefined
  const settings = validateSettings(body.settings)

  const encoder = new TextEncoder()
  const collectedMessages: ChatMessage[] = []

  const stream = new ReadableStream({
    start(controller) {
      const session = new ClaudeSession(cwd)

      session.on('message', (msg: ChatMessage) => {
        collectedMessages.push(msg)
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
        } catch {
          // Stream closed
        }
      })

      session.on('close', async () => {
        const resolvedClaudeSessionId = session.getSessionId()

        // Persist messages to disk
        if (persistSessionId != null && collectedMessages.length > 0) {
          await appendMessages(
            persistSessionId,
            collectedMessages,
            resolvedClaudeSessionId,
          )
        }

        try {
          const closePayload = {
            type: 'close',
            claudeSessionId: resolvedClaudeSessionId,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(closePayload)}\n\n`))
          controller.close()
        } catch {
          // Already closed
        }
      })

      session.send(prompt, claudeSessionId, settings)
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
