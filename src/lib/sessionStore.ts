import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { PersistedSession, ChatMessage } from '@/types/events'

const SESSION_DIR = join(process.env.HOME ?? '', '.claude', 'dashboard')
const SESSION_FILE = join(SESSION_DIR, 'sessions.json')
const MAX_SESSIONS = 50

// ─── Public API ────────────────────────────────────────

export async function listSessions(): Promise<PersistedSession[]> {
  const sessions = await readAllSessions()
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getSession(id: string): Promise<PersistedSession | null> {
  const sessions = await readAllSessions()
  return sessions.find((s) => s.id === id) ?? null
}

export async function saveSession(session: PersistedSession): Promise<void> {
  const sessions = await readAllSessions()
  const idx = sessions.findIndex((s) => s.id === session.id)

  if (idx >= 0) {
    sessions[idx] = session
  } else {
    sessions.push(session)
  }

  // Trim old sessions
  const trimmed = sessions
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SESSIONS)

  await writeAllSessions(trimmed)
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await readAllSessions()
  const filtered = sessions.filter((s) => s.id !== id)
  await writeAllSessions(filtered)
}

export async function appendMessages(
  sessionId: string,
  messages: ChatMessage[],
  claudeSessionId: string | null,
): Promise<void> {
  const sessions = await readAllSessions()
  const session = sessions.find((s) => s.id === sessionId)

  if (session == null) return

  session.messages = [...session.messages, ...messages]
  session.updatedAt = Date.now()

  if (claudeSessionId != null) {
    session.claudeSessionId = claudeSessionId
  }

  await writeAllSessions(sessions)
}

// ─── File I/O ──────────────────────────────────────────

async function readAllSessions(): Promise<PersistedSession[]> {
  if (!existsSync(SESSION_FILE)) {
    return []
  }

  try {
    const raw = await readFile(SESSION_FILE, 'utf-8')
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []
    return parsed as PersistedSession[]
  } catch {
    return []
  }
}

async function writeAllSessions(sessions: PersistedSession[]): Promise<void> {
  if (!existsSync(SESSION_DIR)) {
    await mkdir(SESSION_DIR, { recursive: true })
  }

  await writeFile(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf-8')
}
