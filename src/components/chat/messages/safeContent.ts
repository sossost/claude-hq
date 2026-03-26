/**
 * Safely converts message content to a renderable string.
 * Handles cases where persisted sessions contain raw content blocks
 * ({type, text}[]) instead of plain strings.
 */
export function safeContent(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item != null && 'text' in item) {
          return String((item as { text: unknown }).text)
        }
        return String(item)
      })
      .join('')
  }

  if (typeof value === 'object' && 'text' in value) {
    return String((value as { text: unknown }).text)
  }

  return JSON.stringify(value)
}
