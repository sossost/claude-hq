import { NextRequest, NextResponse } from 'next/server'
import {
  listSessions,
  getSession,
  saveSession,
  deleteSession,
  appendMessages,
} from '@/lib/sessionStore'
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

  if (id != null && id !== '') {
    const session = await getSession(id)
    if (session == null) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return NextResponse.json({ session })
  }

  if (id === '') {
    return NextResponse.json({ error: 'id must not be empty' }, { status: 400 })
  }

  const sessions = await listSessions()
  // Omit messages from list response (lightweight)
  const summaries = sessions.map(({ messages, ...rest }) => ({
    ...rest,
    messageCount: messages.length,
  }))
  return NextResponse.json({ sessions: summaries })
}

/** POST /api/sessions — Create a new session */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const projectPath = typeof body.projectPath === 'string' ? body.projectPath : ''
  const projectName = typeof body.projectName === 'string' ? body.projectName : ''

  if (projectPath === '') {
    return NextResponse.json({ error: 'projectPath is required' }, { status: 400 })
  }

  const session: PersistedSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    claudeSessionId: null,
    projectPath,
    projectName: projectName !== '' ? projectName : projectPath.split('/').pop() ?? 'unknown',
    title: 'New Session',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await saveSession(session)
  return NextResponse.json({ session })
}

/** PATCH /api/sessions — Append messages to an existing session */
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const id = typeof body.id === 'string' ? body.id : ''
  const messages = Array.isArray(body.messages) ? body.messages : null

  if (id === '') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }
  if (messages == null || !messages.every(isValidMessage)) {
    return NextResponse.json({ error: 'messages must be a valid ChatMessage array' }, { status: 400 })
  }

  await appendMessages(id, messages, null)
  return NextResponse.json({ success: true })
}

/** DELETE /api/sessions?id=xxx — Delete a session */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (id == null || id === '') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await deleteSession(id)
  return NextResponse.json({ success: true })
}
