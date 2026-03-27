import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { PersistedSession, ChatMessage } from '@/types/events'
import { requireHome } from '@/lib/env'

const HOME = requireHome()

function isPersistedSession(value: unknown): value is PersistedSession {
  if (typeof value !== 'object' || value == null) return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string'
    && typeof v.projectPath === 'string'
    && Array.isArray(v.messages)
    && typeof v.updatedAt === 'number'
}
const SESSION_DIR = join(HOME, '.claude', 'dashboard')
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

  const trimmed = next
    .toSorted((a, b) => b.updatedAt - a.updatedAt)
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

  const needsTitle = session.title === 'New Session' && session.messages.length === 0
  const firstUserMessage = needsTitle
    ? messages.find((m) => m.role === 'user')
    : null
  const title = firstUserMessage != null
    ? deriveTitle(firstUserMessage.content)
    : session.title

  const updated: PersistedSession = {
    ...session,
    title,
    messages: [...session.messages, ...messages],
    updatedAt: Date.now(),
    claudeSessionId: claudeSessionId ?? session.claudeSessionId,
  }

  const next = sessions.map((s) => s.id === sessionId ? updated : s)
  await writeAllSessions(next)
}

const TITLE_MAX_LENGTH = 40

function deriveTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim()
  if (firstLine.length <= TITLE_MAX_LENGTH) return firstLine
  return firstLine.slice(0, TITLE_MAX_LENGTH) + '…'
}

// ─── File I/O ──────────────────────────────────────────

async function readAllSessions(): Promise<PersistedSession[]> {
  if (existsSync(SESSION_FILE) === false) {
    return []
  }

  try {
    const raw = await readFile(SESSION_FILE, 'utf-8')
    const parsed = JSON.parse(raw)

    if (Array.isArray(parsed) === false) return []
    return parsed.filter(isPersistedSession)
  } catch {
    // Corrupted file — backup before it gets overwritten
    try {
      const backupPath = `${SESSION_FILE}.${Date.now()}.bak`
      const { copyFile } = await import('fs/promises')
      await copyFile(SESSION_FILE, backupPath)
    } catch {
      // Backup failure is non-fatal
    }
    return []
  }
}

async function writeAllSessions(sessions: PersistedSession[]): Promise<void> {
  if (existsSync(SESSION_DIR) === false) {
    await mkdir(SESSION_DIR, { recursive: true })
  }

  await writeFile(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf-8')
}
