import { NextRequest, NextResponse } from 'next/server'
import {
  listSessions,
  getSession,
  saveSession,
  deleteSession,
  appendMessages,
} from '@/lib/sessionStore'
import type { PersistedSession, ChatMessage } from '@/types/events'

export const dynamic = 'force-dynamic'

/** GET /api/sessions — List all sessions or fetch one by id */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (id != null) {
    const session = await getSession(id)
    if (session == null) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return NextResponse.json({ session })
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
  const projectPath = body.projectPath as string
  const projectName = body.projectName as string

  if (projectPath == null || projectPath === '') {
    return NextResponse.json({ error: 'projectPath is required' }, { status: 400 })
  }

  const session: PersistedSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    claudeSessionId: null,
    projectPath,
    projectName: projectName ?? projectPath.split('/').pop() ?? 'unknown',
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
  const id = body.id as string
  const messages = body.messages as ChatMessage[]

  if (id == null || messages == null) {
    return NextResponse.json({ error: 'id and messages required' }, { status: 400 })
  }

  await appendMessages(id, messages, null)
  return NextResponse.json({ success: true })
}

/** DELETE /api/sessions?id=xxx — Delete a session */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (id == null) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await deleteSession(id)
  return NextResponse.json({ success: true })
}
