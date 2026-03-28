import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Claude HQ',
  description: 'Visual control center for Claude Code agent sessions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const themeScript = `
    (function() {
      var t = localStorage.getItem('theme');
      var d = (!t || t === 'system')
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : t === 'dark';
      if (d) document.documentElement.classList.add('dark');
    })();
  `

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
