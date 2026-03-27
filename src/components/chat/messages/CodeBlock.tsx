'use client'

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { createHighlighter, type Highlighter } from 'shiki'
import DOMPurify from 'dompurify'

const LIGHT_THEME = 'github-light'
const DARK_THEME = 'github-dark'
const COPY_FEEDBACK_MS = 2_000
const CODE_MAX_HEIGHT = '32rem'
const COPY_BUTTON_TOP_WITH_LANG = '2.25rem'
const COPY_BUTTON_TOP_DEFAULT = '0.5rem'

// Singleton highlighter — initialized once, reused across all code blocks
let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (highlighterPromise == null) {
    highlighterPromise = createHighlighter({
      themes: [LIGHT_THEME, DARK_THEME],
      langs: [
        'typescript', 'javascript', 'tsx', 'jsx', 'json', 'html', 'css',
        'python', 'bash', 'shell', 'markdown', 'yaml', 'sql', 'go',
        'rust', 'java', 'c', 'cpp', 'ruby', 'php', 'swift', 'kotlin',
        'diff', 'plaintext',
      ],
    })
  }
  return highlighterPromise
}

// ── Shared theme observer ─────────────────────────────────
// Single MutationObserver for all CodeBlock instances.
// Subscribers are notified when the <html> class changes.

type ThemeListener = () => void
const themeListeners = new Set<ThemeListener>()
let themeObserver: MutationObserver | null = null
let currentThemeKey = typeof document !== 'undefined'
  ? (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  : 'light'

function ensureThemeObserver() {
  if (themeObserver != null || typeof document === 'undefined') return
  themeObserver = new MutationObserver(() => {
    const next = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    if (next !== currentThemeKey) {
      currentThemeKey = next
      themeListeners.forEach((fn) => fn())
    }
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
}

function subscribeTheme(listener: ThemeListener): () => void {
  ensureThemeObserver()
  themeListeners.add(listener)
  return () => {
    themeListeners.delete(listener)
  }
}

function getThemeSnapshot(): string {
  return currentThemeKey
}

function getServerThemeSnapshot(): string {
  return 'light'
}

function useThemeKey(): string {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot)
}

// ── CodeBlock Component ───────────────────────────────────

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const themeKey = useThemeKey()
  const [html, setHtml] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const highlight = useCallback(async () => {
    const trimmed = code.replace(/\n$/, '')
    if (trimmed === '') {
      setHtml(null)
      return
    }

    try {
      const highlighter = await getHighlighter()
      const theme = themeKey === 'dark' ? DARK_THEME : LIGHT_THEME
      const lang = language ?? 'plaintext'

      const loadedLangs = highlighter.getLoadedLanguages()
      const resolvedLang = loadedLangs.includes(lang) ? lang : 'plaintext'

      const raw = highlighter.codeToHtml(trimmed, {
        lang: resolvedLang,
        theme,
      })
      setHtml(DOMPurify.sanitize(raw))
    } catch {
      setHtml(null)
    }
  }, [code, language, themeKey])

  useEffect(() => {
    highlight()
  }, [highlight])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), COPY_FEEDBACK_MS)
    } catch {
      // Clipboard API not available
    }
  }, [code])

  const trimmedCode = code.replace(/\n$/, '')
  const hasClipboard = typeof navigator !== 'undefined' && navigator.clipboard != null
  const showCopy = hasClipboard && trimmedCode !== ''
  const hasLang = language != null && language !== ''
  const copyTop = hasLang ? COPY_BUTTON_TOP_WITH_LANG : COPY_BUTTON_TOP_DEFAULT

  return (
    <div
      className="group relative rounded-lg overflow-hidden text-sm"
      style={{ border: '1px solid var(--border)' }}
    >
      {hasLang && (
        <div
          className="flex items-center justify-between px-3 py-1.5 text-xs"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            color: 'var(--content-muted)',
          }}
        >
          <span>{language}</span>
        </div>
      )}

      {showCopy && (
        <button
          onClick={handleCopy}
          className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded px-2 py-1 text-xs"
          style={{
            background: 'var(--surface)',
            color: 'var(--content-secondary)',
            border: '1px solid var(--border)',
            top: copyTop,
          }}
          aria-label="Copy code"
        >
          {isCopied ? '✓' : 'Copy'}
        </button>
      )}

      {html != null ? (
        <div
          className="overflow-x-auto [&_pre]:!m-0 [&_pre]:!p-3 [&_pre]:!rounded-none [&_pre]:!text-sm [&_code]:!text-sm"
          style={{ maxHeight: CODE_MAX_HEIGHT }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className="overflow-x-auto p-3 font-mono text-sm"
          style={{
            background: 'var(--surface)',
            color: 'var(--foreground)',
            maxHeight: CODE_MAX_HEIGHT,
            margin: 0,
          }}
        >
          <code>{trimmedCode}</code>
        </pre>
      )}
    </div>
  )
}
