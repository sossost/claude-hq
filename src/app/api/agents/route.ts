import { NextRequest } from 'next/server'
import { listAgents } from '@/lib/agentStore'
import { assertSafePath } from '@/lib/pathValidator'
import { ok, err } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'

/** GET /api/agents?projectPath=/path/to/project — List available agents */
export async function GET(request: NextRequest) {
  const projectPath = request.nextUrl.searchParams.get('projectPath')

  if (projectPath != null && projectPath !== '') {
    try {
      assertSafePath(projectPath)
    } catch {
      return err('VALIDATION_ERROR', 'Invalid project path')
    }
  }

  const agents = await listAgents(projectPath ?? undefined)
  return ok({ agents })
}
