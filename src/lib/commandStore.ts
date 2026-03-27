import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import type { CommandDefinition, CommandSource } from '@/types/events'
import { requireHome } from '@/lib/env'

const HOME = requireHome()
const GLOBAL_COMMANDS_DIR = join(HOME, '.claude', 'commands')

const BUILTIN_COMMANDS: CommandDefinition[] = [
  { name: 'clear', description: 'Clear chat messages', template: '', source: 'builtin' },
  { name: 'new', description: 'Start a new session', template: '', source: 'builtin' },
  { name: 'model', description: 'Switch model (opus, sonnet, haiku)', template: '', source: 'builtin' },
  { name: 'effort', description: 'Set effort level (low, medium, high, max)', template: '', source: 'builtin' },
  { name: 'permission', description: 'Set permission mode (default, auto, plan)', template: '', source: 'builtin' },
]

export async function listCommands(projectPath?: string): Promise<CommandDefinition[]> {
  const projectCommands = projectPath != null
    ? await scanCommandsDir(join(projectPath, '.claude', 'commands'), 'project')
    : []

  const globalCommands = await scanCommandsDir(GLOBAL_COMMANDS_DIR, 'global')

  // Project commands override global commands with the same name
  const projectNames = new Set(projectCommands.map((c) => c.name))
  const deduped = globalCommands.filter((c) => projectNames.has(c.name) === false)

  // Builtin commands are always appended (custom commands can override them)
  const allCustomNames = new Set([...projectNames, ...deduped.map((c) => c.name)])
  const builtins = BUILTIN_COMMANDS.filter((c) => allCustomNames.has(c.name) === false)

  return [...builtins, ...projectCommands, ...deduped].sort((a, b) => a.name.localeCompare(b.name))
}

async function scanCommandsDir(dir: string, source: CommandSource): Promise<CommandDefinition[]> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }

  const nested = await Promise.all(
    entries
      .filter((entry) => entry.startsWith('.') === false)
      .map(async (entry): Promise<CommandDefinition[]> => {
        const entryPath = join(dir, entry)

        try {
          const entryStat = await stat(entryPath)

          if (entryStat.isDirectory()) {
            return scanSubDir(entryPath, entry, source)
          }
          if (entry.endsWith('.md')) {
            const content = await readFile(entryPath, 'utf-8')
            return [parseCommandFile(entry, '', content, source)]
          }
        } catch {
          // Skip unreadable entries
        }
        return []
      }),
  )

  return nested.flat()
}

async function scanSubDir(dir: string, prefix: string, source: CommandSource): Promise<CommandDefinition[]> {
  let files: string[]
  try {
    const entries = await readdir(dir)
    files = entries.filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const content = await readFile(join(dir, file), 'utf-8')
        return parseCommandFile(file, prefix, content, source)
      } catch {
        return null
      }
    }),
  )

  return results.filter((c): c is CommandDefinition => c != null)
}

function parseCommandFile(filename: string, prefix: string, content: string, source: CommandSource): CommandDefinition {
  const baseName = filename.replace(/\.md$/, '')
  const name = prefix !== '' ? `${prefix}:${baseName}` : baseName

  // Try YAML frontmatter first (same format as agent .md files)
  const frontmatter = parseFrontmatter(content)
  const description = frontmatter.description !== ''
    ? frontmatter.description
    : extractFirstLine(frontmatter.body)

  // Use body (after frontmatter) as template, fallback to full content
  const template = frontmatter.body.trim() !== '' ? frontmatter.body.trim() : content.trim()

  return { name, description, template, source }
}

function parseFrontmatter(content: string): { description: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (match == null) {
    return { description: '', body: content }
  }

  const frontmatterBlock = match[1]
  const body = match[2]

  for (const line of frontmatterBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    if (key === 'description') {
      const raw = line.slice(colonIdx + 1).trim()
      // Strip surrounding quotes
      return { description: raw.replace(/^["']|["']$/g, ''), body }
    }
  }

  return { description: '', body }
}

function extractFirstLine(text: string): string {
  const line = text.split('\n').find((l) => l.trim() !== '')?.trim() ?? ''
  return line.replace(/^#+\s*/, '')
}
