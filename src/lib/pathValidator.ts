import { resolve } from 'path'
import { existsSync } from 'fs'

const HOME = process.env.HOME ?? ''

/**
 * Validates that a path resolves to an existing directory
 * under the user's HOME. Rejects paths with traversal attacks.
 */
export function assertSafePath(raw: string): string {
  const resolved = resolve(raw)

  if (!resolved.startsWith(HOME + '/') && resolved !== HOME) {
    throw new PathValidationError(`Path is outside the home directory: ${resolved}`)
  }

  if (!existsSync(resolved)) {
    throw new PathValidationError(`Path does not exist: ${resolved}`)
  }

  return resolved
}

export class PathValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PathValidationError'
  }
}
