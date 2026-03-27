import { resolve } from 'path'
import { existsSync } from 'fs'
import { requireHome } from '@/lib/env'

const HOME = requireHome()

/**
 * Validates that a path resolves to an existing directory
 * under the user's HOME. Rejects paths with traversal attacks.
 */
export function assertSafePath(raw: string): string {
  const resolved = resolve(raw)

  if (resolved.startsWith(HOME + '/') === false && resolved !== HOME) {
    throw new PathValidationError('Invalid path')
  }

  if (existsSync(resolved) === false) {
    throw new PathValidationError('Path is not accessible')
  }

  return resolved
}

export class PathValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PathValidationError'
  }
}
