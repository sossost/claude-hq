'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import type { Components } from 'react-markdown'

interface MarkdownRendererProps {
  content: string
}

const components: Components = {
  code({ className, children, ...rest }) {
    // Fenced code block: has language class like "language-typescript"
    const match = /language-(\w+)/.exec(className ?? '')
    const code = String(children).replace(/\n$/, '')

    if (match != null) {
      return <CodeBlock code={code} language={match[1]} />
    }

    // Inline code
    return (
      <code
        className="rounded px-1.5 py-0.5 text-[0.85em] font-mono"
        style={{
          background: 'var(--surface)',
          color: 'var(--foreground)',
        }}
        {...rest}
      >
        {children}
      </code>
    )
  },

  pre({ children }) {
    // Let CodeBlock handle its own wrapper — unwrap the <pre> that react-markdown adds
    return <>{children}</>
  },

  a({ href, children, ...rest }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--primary)' }}
        className="underline underline-offset-2"
        {...rest}
      >
        {children}
      </a>
    )
  },

  table({ children, ...rest }) {
    return (
      <div className="overflow-x-auto my-3">
        <table
          className="w-full text-sm border-collapse"
          style={{ border: '1px solid var(--border)' }}
          {...rest}
        >
          {children}
        </table>
      </div>
    )
  },

  th({ children, ...rest }) {
    return (
      <th
        className="text-left px-3 py-2 font-medium text-sm"
        style={{
          borderBottom: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
        {...rest}
      >
        {children}
      </th>
    )
  },

  td({ children, ...rest }) {
    return (
      <td
        className="px-3 py-2 text-sm"
        style={{
          borderBottom: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
        }}
        {...rest}
      >
        {children}
      </td>
    )
  },

  blockquote({ children, ...rest }) {
    return (
      <blockquote
        className="my-3 pl-4"
        style={{
          borderLeft: '3px solid var(--border)',
          color: 'var(--content-secondary)',
        }}
        {...rest}
      >
        {children}
      </blockquote>
    )
  },
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
