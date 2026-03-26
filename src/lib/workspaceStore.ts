import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { Project } from '@/types/events'

const HOME = process.env.HOME ?? ''
const DASHBOARD_DIR = join(HOME, '.claude', 'dashboard')
const WORKSPACE_FILE = join(DASHBOARD_DIR, 'workspace.json')

interface WorkspaceEntry {
  path: string
  addedAt: number
}

interface Workspace {
  projects: WorkspaceEntry[]
}

async function readWorkspace(): Promise<Workspace> {
  if (!existsSync(WORKSPACE_FILE)) {
    return { projects: [] }
  }
  try {
    const raw = await readFile(WORKSPACE_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return { projects: Array.isArray(parsed.projects) ? parsed.projects : [] }
  } catch {
    return { projects: [] }
  }
}

async function writeWorkspace(workspace: Workspace): Promise<void> {
  if (!existsSync(DASHBOARD_DIR)) {
    await mkdir(DASHBOARD_DIR, { recursive: true })
  }
  await writeFile(WORKSPACE_FILE, JSON.stringify(workspace, null, 2))
}

function deriveProjectName(projectPath: string): string {
  if (projectPath.startsWith(HOME + '/')) {
    const relative = projectPath.slice(HOME.length + 1)
    return relative === '' ? projectPath.split('/').pop() ?? projectPath : relative
  }
  return projectPath.split('/').pop() ?? projectPath
}

function toProject(entry: WorkspaceEntry): Project {
  return {
    name: deriveProjectName(entry.path),
    path: entry.path,
    exists: existsSync(entry.path),
  }
}

export async function getImportedProjects(): Promise<Project[]> {
  const workspace = await readWorkspace()
  return workspace.projects.map(toProject)
}

export async function importProject(path: string): Promise<Project> {
  const workspace = await readWorkspace()
  const alreadyExists = workspace.projects.some((p) => p.path === path)

  if (!alreadyExists) {
    const updated: Workspace = {
      projects: [...workspace.projects, { path, addedAt: Date.now() }],
    }
    await writeWorkspace(updated)
  }

  return {
    name: deriveProjectName(path),
    path,
    exists: existsSync(path),
  }
}

export async function removeProject(path: string): Promise<void> {
  const workspace = await readWorkspace()
  const updated: Workspace = {
    projects: workspace.projects.filter((p) => p.path !== path),
  }
  await writeWorkspace(updated)
}
