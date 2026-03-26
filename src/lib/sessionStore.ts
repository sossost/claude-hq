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

  const next = idx >= 0
    ? sessions.map((s, i) => i === idx ? session : s)
    : [...sessions, session]

  const trimmed = [...next]
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

  const updated: PersistedSession = {
    ...session,
    messages: [...session.messages, ...messages],
    updatedAt: Date.now(),
    claudeSessionId: claudeSessionId ?? session.claudeSessionId,
  }

  const next = sessions.map((s) => s.id === sessionId ? updated : s)
  await writeAllSessions(next)
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
