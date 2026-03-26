import { NextRequest, NextResponse } from 'next/server'
import { listAgents } from '@/lib/agentStore'
import { assertSafePath } from '@/lib/pathValidator'

export const dynamic = 'force-dynamic'

/** GET /api/agents?projectPath=/path/to/project — List available agents */
export async function GET(request: NextRequest) {
  const projectPath = request.nextUrl.searchParams.get('projectPath')

  if (projectPath != null && projectPath !== '') {
    try {
      assertSafePath(projectPath)
    } catch {
      return NextResponse.json({ error: 'Invalid project path' }, { status: 400 })
    }
  }

  const agents = await listAgents(projectPath ?? undefined)
  return NextResponse.json({ agents })
}
