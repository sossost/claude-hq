import { readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { Project } from '@/types/events'
import { requireHome } from '@/lib/env'

const HOME = requireHome()
const CLAUDE_PROJECTS_DIR = join(HOME, '.claude', 'projects')

/**
 * Scans ~/.claude/projects/ to build a list of projects
 * that Claude Code has been used with.
 *
 * Folder naming convention:
 *   -Users-alice-my-project → /Users/alice/my-project
 */
export async function listProjects(): Promise<Project[]> {
  if (existsSync(CLAUDE_PROJECTS_DIR) === false) {
    return []
  }

  const entries = await readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory())

  const projects: Project[] = []

  for (const dir of dirs) {
    const realPath = decodeFolderName(dir.name)
    if (realPath == null) continue

    const name = extractProjectName(realPath)
    projects.push({ name, path: realPath, exists: true })
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Decodes a Claude Code project folder name back to an absolute path.
 *
 * Claude encodes paths by replacing '/' with '-':
 *   "-Users-alice-my-project" → "/Users/alice/my-project"
 *
 * Reverse mapping is ambiguous (hyphens could be separators or part of
 * the name), so we anchor on the home directory and search for existing
 * paths in the remaining segments.
 */
function decodeFolderName(encoded: string): string | null {
  // Strip leading '-'
  const stripped = encoded.startsWith('-') ? encoded.slice(1) : encoded

  // Encode the home path for prefix matching (e.g., "Users/alice" → "Users-alice")
  const homeEncoded = HOME.slice(1).replaceAll('/', '-')

  if (stripped.startsWith(homeEncoded) === false) {
    return null
  }

  // Extract remainder after home prefix (e.g., "-my-project")
  const remainder = stripped.slice(homeEncoded.length)

  if (remainder === '') {
    return HOME
  }

  // Strip leading '-'
  const segments = remainder.startsWith('-') ? remainder.slice(1) : remainder

  if (segments === '') {
    return HOME
  }

  // Split on '-' and search for existing path combinations
  const parts = segments.split('-')
  return findExistingPath(HOME, parts)
}

/**
 * Recursively tries to resolve an array of name parts into an existing
 * filesystem path by testing different hyphen-as-separator combinations.
 *
 * e.g., ["harness", "engineering", "dashboard"]
 *   → /base/harness-engineering/dashboard (if it exists)
 *   → /base/harness/engineering-dashboard (if it exists)
 */
function findExistingPath(base: string, parts: string[]): string | null {
  if (parts.length === 0) {
    return existsSync(base) ? base : null
  }

  // Try joining 1..N parts as a single directory name (longest first)
  for (let take = parts.length; take >= 1; take--) {
    const name = parts.slice(0, take).join('-')
    const candidate = join(base, name)

    if (existsSync(candidate) === false) continue

    const remaining = parts.slice(take)
    if (remaining.length === 0) {
      return candidate
    }

    const deeper = findExistingPath(candidate, remaining)
    if (deeper != null) {
      return deeper
    }
  }

  return null
}

/**
 * Extracts a display name from an absolute project path.
 * Uses the relative path from HOME as the name.
 */
function extractProjectName(path: string): string {
  if (path.startsWith(HOME + '/')) {
    const relative = path.slice(HOME.length + 1)
    return relative === '' ? path.split('/').pop() ?? path : relative
  }

  return path.split('/').pop() ?? path
}
