import { NextRequest } from 'next/server'
import { listCommands } from '@/lib/commandStore'
import { assertSafePath } from '@/lib/pathValidator'
import { ok, err } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'

/** GET /api/commands?projectPath=/path/to/project — List available custom commands */
export async function GET(request: NextRequest) {
  const projectPath = request.nextUrl.searchParams.get('projectPath')

  if (projectPath != null && projectPath !== '') {
    try {
      assertSafePath(projectPath)
    } catch {
      return err('VALIDATION_ERROR', 'Invalid project path')
    }
  }

  const commands = await listCommands(projectPath ?? undefined)
  return ok({ commands })
}
