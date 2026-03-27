import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { AgentDefinition, AgentSource, AgentCategory } from '@/types/events'
import { requireHome } from '@/lib/env'

const HOME = requireHome()
const GLOBAL_AGENTS_DIR = join(HOME, '.claude', 'agents')

const CATEGORY_MAP: Record<string, AgentCategory> = {
  // Planning & Design
  'architect': 'planning',
  'planner': 'planning',
  'Plan': 'planning',
  'mission-planner': 'planning',
  'strategic-aide': 'planning',
  // Code Quality
  'code-reviewer': 'quality',
  'security-reviewer': 'quality',
  'tdd-guide': 'quality',
  'qa-analyst': 'quality',
  // Build & Test
  'build-error-resolver': 'build',
  'e2e-runner': 'build',
  'backend-engineer': 'build',
  'frontend-engineer': 'build',
  // Maintenance
  'refactor-cleaner': 'maintenance',
  'doc-updater': 'maintenance',
  'statusline-setup': 'maintenance',
  'moderator': 'maintenance',
  'pr-manager': 'maintenance',
  // Exploration
  'Explore': 'exploration',
  'general-purpose': 'exploration',
  'claude-code-guide': 'exploration',
  'fundamental-analyst': 'exploration',
  'tech-analyst': 'exploration',
  'macro-economist': 'exploration',
  'sentiment-analyst': 'exploration',
  'geopolitics': 'exploration',
}

function deriveCategory(name: string, description: string): AgentCategory {
  if (CATEGORY_MAP[name] != null) return CATEGORY_MAP[name]

  const desc = description.toLowerCase()
  if (desc.includes('plan') || desc.includes('architect') || desc.includes('design') || desc.includes('strateg')) return 'planning'
  if (desc.includes('review') || desc.includes('security') || desc.includes('test') || desc.includes('qa') || desc.includes('quality')) return 'quality'
  if (desc.includes('build') || desc.includes('error') || desc.includes('e2e') || desc.includes('engineer') || desc.includes('develop')) return 'build'
  if (desc.includes('refactor') || desc.includes('clean') || desc.includes('doc') || desc.includes('maintain')) return 'maintenance'
  return 'exploration'
}

const BUILT_IN_AGENTS: AgentDefinition[] = [
  {
    name: 'general-purpose',
    description: 'General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks.',
    tools: ['*'],
    model: 'inherit',
    source: 'built-in',
    category: 'exploration',
  },
  {
    name: 'Explore',
    description: 'Fast agent specialized for exploring codebases. Finds files by patterns, searches code for keywords.',
    tools: ['Read', 'Grep', 'Glob', 'Bash'],
    model: 'haiku',
    source: 'built-in',
    category: 'exploration',
  },
  {
    name: 'Plan',
    description: 'Software architect agent for designing implementation plans and identifying critical files.',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'inherit',
    source: 'built-in',
    category: 'planning',
  },
  {
    name: 'claude-code-guide',
    description: 'Answers questions about Claude Code features, hooks, slash commands, MCP servers, and settings.',
    tools: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
    model: 'haiku',
    source: 'built-in',
    category: 'exploration',
  },
  {
    name: 'statusline-setup',
    description: 'Configures the Claude Code status line setting.',
    tools: ['Read', 'Edit'],
    model: 'sonnet',
    source: 'built-in',
    category: 'maintenance',
  },
]

export async function listAgents(projectPath?: string): Promise<AgentDefinition[]> {
  const projectAgents = projectPath != null
    ? await scanAgentsDir(join(projectPath, '.claude', 'agents'), 'project')
    : []

  // If project has its own agents, skip global user agents (noise reduction)
  const globalAgents = projectAgents.length > 0
    ? []
    : await scanAgentsDir(GLOBAL_AGENTS_DIR, 'user')

  return [...projectAgents, ...globalAgents, ...BUILT_IN_AGENTS]
}

async function scanAgentsDir(dir: string, source: AgentSource): Promise<AgentDefinition[]> {
  let files: string[]
  try {
    const entries = await readdir(dir)
    files = entries.filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }

  const agents: AgentDefinition[] = []

  for (const file of files) {
    try {
      const content = await readFile(join(dir, file), 'utf-8')
      const parsed = parseFrontmatter(content, source)
      if (parsed != null) {
        agents.push(parsed)
      }
    } catch {
      // Skip unreadable files
    }
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name))
}

function parseFrontmatter(content: string, source: AgentSource): AgentDefinition | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (match == null) return null

  const frontmatter = match[1]
  const fields = new Map<string, string>()

  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    fields.set(key, value)
  }

  const name = fields.get('name')
  if (name == null || name === '') return null

  const model = fields.get('model') ?? 'inherit'

  const toolsRaw = fields.get('tools') ?? ''
  const tools = toolsRaw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t !== '')

  const description = fields.get('description') ?? ''

  return {
    name,
    description,
    tools,
    model,
    source,
    category: deriveCategory(name, description),
  }
}
