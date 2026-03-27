import { readFile } from 'fs/promises'
import { spawn } from 'child_process'
import { join } from 'path'
import { homedir } from 'os'
import { ok } from '@/lib/apiResponse'

export const dynamic = 'force-dynamic'

interface ClaudeDefaults {
  model: string | null
  effortLevel: string | null
  permissionMode: string | null
}

const CACHE_TTL_MS = 5 * 60_000
const PROBE_TIMEOUT_MS = 10_000
const PROBE_MAX_BUDGET_USD = '0.01'

// In-memory cache — survives across requests within the same server process
let cachedDefaults: ClaudeDefaults | null = null
let cacheTimestamp = 0

export async function GET() {
  const now = Date.now()

  if (cachedDefaults != null && now - cacheTimestamp < CACHE_TTL_MS) {
    return ok(cachedDefaults)
  }

  const home = homedir()
  const defaults: ClaudeDefaults = {
    model: null,
    effortLevel: null,
    permissionMode: null,
  }

  // Read settings files for effortLevel
  for (const filename of ['settings.json', 'settings.local.json']) {
    try {
      const raw = await readFile(join(home, '.claude', filename), 'utf-8')
      const data = JSON.parse(raw) as Record<string, unknown>

      if (typeof data['effortLevel'] === 'string') {
        defaults.effortLevel = data['effortLevel']
      }
    } catch {
      // File doesn't exist or parse error — skip
    }
  }

  // Probe CLI for actual model and permissionMode
  try {
    const initData = await probeCliDefaults(home)
    if (initData.model != null) defaults.model = initData.model
    if (initData.permissionMode != null) defaults.permissionMode = initData.permissionMode
  } catch {
    // Probe failure is non-fatal
  }

  cachedDefaults = defaults
  cacheTimestamp = now
  return ok(defaults)
}

function probeCliDefaults(cwd: string): Promise<{ model: string | null; permissionMode: string | null }> {
  return new Promise((resolve) => {
    const result = { model: null as string | null, permissionMode: null as string | null }
    const proc = spawn('claude', [
      '-p', 'hi',
      '--output-format', 'stream-json',
      '--verbose',
      '--max-budget-usd', PROBE_MAX_BUDGET_USD,
    ], {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM')
      resolve(result)
    }, PROBE_TIMEOUT_MS)

    let buffer = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        try {
          const event = JSON.parse(line)
          if (event.type === 'system' && event.subtype === 'init') {
            if (typeof event.model === 'string') result.model = event.model
            if (typeof event.permissionMode === 'string') result.permissionMode = event.permissionMode
            proc.kill('SIGTERM')
            clearTimeout(timeout)
            resolve(result)
            return
          }
        } catch {
          // Ignore
        }
      }
    })

    proc.on('close', () => {
      clearTimeout(timeout)
      resolve(result)
    })

    proc.on('error', () => {
      clearTimeout(timeout)
      resolve(result)
    })
  })
}
