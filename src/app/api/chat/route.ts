import { NextRequest, NextResponse } from 'next/server'
import { ClaudeSession } from '@/lib/claudeProcess'
import { appendMessages } from '@/lib/sessionStore'
import type { ChatMessage } from '@/types/events'

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
  const prompt = body.prompt as string
  const cwd = (body.cwd as string) ?? process.cwd()
  const claudeSessionId = body.claudeSessionId as string | undefined
  const persistSessionId = body.persistSessionId as string | undefined

  if (prompt == null || prompt.trim() === '') {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

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

      session.send(prompt, claudeSessionId)
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
