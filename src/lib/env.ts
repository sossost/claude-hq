/**
 * Returns the HOME environment variable or throws if it is missing.
 * Used at module init time by server-side stores — ensures paths
 * are never constructed from an empty string.
 */
export function requireHome(): string {
  const home = process.env.HOME
  if (home == null || home === '') {
    throw new Error('HOME environment variable is required')
  }
  return home
}
