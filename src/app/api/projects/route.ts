import { NextRequest } from 'next/server'
import { listProjects } from '@/lib/projectStore'
import { getImportedProjects, importProject, removeProject } from '@/lib/workspaceStore'
import { assertSafePath, PathValidationError } from '@/lib/pathValidator'
import { ok, err } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'

/**
 * GET /api/projects              → imported (workspace) projects
 * GET /api/projects?available=1  → detected but not yet imported
 */
export async function GET(req: NextRequest) {
  const isAvailable = req.nextUrl.searchParams.get('available') === '1'

  if (isAvailable) {
    const [all, imported] = await Promise.all([listProjects(), getImportedProjects()])
    const importedPaths = new Set(imported.map((p) => p.path))
    const available = all.filter((p) => importedPaths.has(p.path) === false)
    return ok({ projects: available })
  }

  const projects = await getImportedProjects()
  return ok({ projects })
}

/** POST /api/projects — import a project { path } */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const rawPath: unknown = body.path

  if (typeof rawPath !== 'string' || rawPath === '') {
    return err('VALIDATION_ERROR', 'path is required')
  }

  let safePath: string
  try {
    safePath = assertSafePath(rawPath)
  } catch (e) {
    if (e instanceof PathValidationError) {
      return err('VALIDATION_ERROR', e.message)
    }
    throw e
  }

  const project = await importProject(safePath)
  return ok({ project })
}

/** DELETE /api/projects?path=... — remove from workspace */
export async function DELETE(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')

  if (path == null || path === '') {
    return err('VALIDATION_ERROR', 'path is required')
  }

  await removeProject(path)
  return ok({ removed: true })
}
