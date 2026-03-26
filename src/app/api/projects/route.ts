import { NextRequest, NextResponse } from 'next/server'
import { listProjects } from '@/lib/projectStore'
import { getImportedProjects, importProject, removeProject } from '@/lib/workspaceStore'
import { assertSafePath, PathValidationError } from '@/lib/pathValidator'

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
    const available = all.filter((p) => !importedPaths.has(p.path))
    return NextResponse.json({ projects: available })
  }

  const projects = await getImportedProjects()
  return NextResponse.json({ projects })
}

/** POST /api/projects — import a project { path } */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const rawPath: unknown = body.path

  if (typeof rawPath !== 'string' || rawPath === '') {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }

  let safePath: string
  try {
    safePath = assertSafePath(rawPath)
  } catch (err) {
    if (err instanceof PathValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  const project = await importProject(safePath)
  return NextResponse.json({ project })
}

/** DELETE /api/projects?path=... — remove from workspace */
export async function DELETE(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')

  if (path == null || path === '') {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }

  await removeProject(path)
  return NextResponse.json({ success: true })
}
