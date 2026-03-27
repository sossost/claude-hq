import { NextRequest } from 'next/server'
import {
  listSessions,
  getSession,
  saveSession,
  deleteSession,
  appendMessages,
} from '@/lib/sessionStore'
import { ok, err } from '@/lib/apiResponse'
import type { PersistedSession } from '@/types/events'

export const dynamic = 'force-dynamic'

const VALID_ROLES = new Set(['user', 'assistant', 'tool', 'system', 'status'])

function isValidMessage(msg: unknown): boolean {
  if (msg == null || typeof msg !== 'object') return false
  const m = msg as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.role === 'string' &&
    VALID_ROLES.has(m.role) &&
    typeof m.timestamp === 'number'
  )
}

/** GET /api/sessions — List all sessions or fetch one by id */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (id === '') {
    return err('VALIDATION_ERROR', 'id must not be empty')
  }

  if (id != null) {
    const session = await getSession(id)
    if (session == null) {
      return err('NOT_FOUND', 'Session not found', 404)
    }
    return ok({ session })
  }

  const sessions = await listSessions()
  const summaries = sessions.map(({ messages, ...rest }) => ({
    ...rest,
    messageCount: messages.length,
  }))
  return ok({ sessions: summaries })
}

/** POST /api/sessions — Create a new session */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const projectPath = typeof body.projectPath === 'string' ? body.projectPath : ''
  const projectName = typeof body.projectName === 'string' ? body.projectName : ''

  if (projectPath === '') {
    return err('VALIDATION_ERROR', 'projectPath is required')
  }

  const session: PersistedSession = {
    id: `session-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    claudeSessionId: null,
    projectPath,
    projectName: projectName !== '' ? projectName : projectPath.split('/').pop() ?? 'unknown',
    title: 'New Session',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await saveSession(session)
  return ok({ session })
}

/** PATCH /api/sessions — Append messages to an existing session */
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const id = typeof body.id === 'string' ? body.id : ''
  const messages = Array.isArray(body.messages) ? body.messages : null

  if (id === '') {
    return err('VALIDATION_ERROR', 'id is required')
  }
  if (messages == null || messages.every(isValidMessage) === false) {
    return err('VALIDATION_ERROR', 'messages must be a valid ChatMessage array')
  }

  await appendMessages(id, messages, null)
  return ok({ appended: true })
}

/** DELETE /api/sessions?id=xxx — Delete a session */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (id == null || id === '') {
    return err('VALIDATION_ERROR', 'id is required')
  }

  await deleteSession(id)
  return ok({ deleted: true })
}
