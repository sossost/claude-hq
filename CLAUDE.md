# Claude HQ — Project Instructions

## What is this?

A local web dashboard that wraps the Claude Code CLI in a visual interface.
Users interact with Claude agents through a chat UI instead of a terminal.
See `docs/01-vision.md` for full project vision.

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend**: Next.js API routes (same process)
- **Core mechanism**: `child_process.spawn('claude', ['-p', ...])` with `--output-format stream-json --verbose`
- **Session continuity**: `--resume SESSION_ID`
- **Package manager**: Yarn 4 (Berry, node-modules linker)
- **Language**: TypeScript (strict mode)

## Architecture

```
Browser (client-only, no SSR)
    ↕ HTTP / SSE
Next.js API routes (local server)
    ↕ child_process.spawn
Claude Code CLI (claude -p)
    ↕ Max subscription
Claude Model
```

- **No SSR** — page uses `dynamic(() => import(...), { ssr: false })`. Local-only tool, SSR adds no value.
- **No external DB** — sessions in `~/.claude/dashboard/sessions.json`, workspace in `workspace.json`
- **No cloud deployment** — requires `claude` CLI on the same machine

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  ← Entry point (dynamic import, no SSR)
│   ├── layout.tsx                ← Root layout + theme init script
│   ├── globals.css               ← Semantic design tokens (light/dark)
│   └── api/
│       ├── chat/route.ts         ← Spawns claude CLI, streams SSE
│       ├── projects/route.ts     ← Project workspace CRUD + available listing
│       └── sessions/route.ts     ← Session CRUD (GET/POST/PATCH/DELETE)
├── components/
│   ├── Dashboard.tsx             ← Layout orchestration (header + sidebar + main)
│   ├── chat/                     ← Chat panel module
│   │   ├── index.ts              ← Public API (ChatPanel)
│   │   ├── ChatPanel.tsx         ← Composes Messages + Input
│   │   ├── ChatMessages.tsx      ← Message list + auto-scroll
│   │   ├── ChatInput.tsx         ← Input with IME composition handling
│   │   ├── ChatEmptyState.tsx    ← Empty state placeholder
│   │   ├── RunningIndicator.tsx  ← Running status dot
│   │   └── messages/             ← Per-type bubble components
│   │       ├── UserBubble.tsx
│   │       ├── AssistantBubble.tsx
│   │       ├── ToolBubble.tsx
│   │       ├── StatusBubble.tsx
│   │       └── SystemBubble.tsx
│   └── project/                  ← Project selector module
│       ├── index.ts              ← Public API (ProjectList)
│       ├── ProjectList.tsx       ← Sidebar project list
│       ├── ProjectItem.tsx       ← Project row with remove
│       └── ProjectImportDialog.tsx ← Import modal
├── lib/
│   ├── claudeProcess.ts          ← ClaudeSession class (spawn + parse stream-json)
│   ├── pathValidator.ts          ← Path traversal prevention (HOME boundary)
│   ├── projectStore.ts           ← Scans ~/.claude/projects/, decodes folder names
│   ├── workspaceStore.ts         ← Imported projects CRUD (workspace.json)
│   ├── sessionStore.ts           ← Session persistence (sessions.json)
│   ├── useChat.ts                ← Chat state + SSE streaming hook
│   ├── useProjects.ts            ← Project list + import/remove hook
│   └── useTheme.ts               ← Dark/light toggle hook
└── types/
    └── events.ts                 ← All type definitions (events, messages, project, session)
```

## Layout

```
┌──────────────────────────────────────┐
│  ☰ Claude HQ   project-name   [D/L] │
├────────────┬─────────────────────────┤
│ PROJECTS   │                         │
│ > project1 │     Chat Messages       │
│   project2 │                         │
│            │                         │
│ (+ Import) ├─────────────────────────┤
│            │  Chat Input             │
└────────────┴─────────────────────────┘
```

- Sidebar: collapsible, shows imported projects only
- Chat panel: self-contained module (messages + input)
- Header: sidebar toggle, project name, theme, new session

## Key Data Flow

1. User sends message → `POST /api/chat` with `{ prompt, cwd, claudeSessionId }`
2. Server validates path (`assertSafePath`) and spawns `claude -p` child process
3. Each NDJSON line is parsed into a `ChatMessage` and sent via SSE
4. Client receives SSE events and appends to message list
5. On completion, messages are persisted to `~/.claude/dashboard/sessions.json`
6. Next message sends `claudeSessionId` for `--resume` continuity

## Project Management

- Projects are **imported** by the user, not auto-listed
- `~/.claude/projects/` is scanned for available projects (import dialog)
- Imported projects are stored in `~/.claude/dashboard/workspace.json`
- Users can remove projects from their workspace at any time

## Design System

All colors are managed via semantic CSS variables in `globals.css`.

| Category | Tokens | Purpose |
|----------|--------|---------|
| Surface | `--background`, `--foreground`, `--surface`, `--surface-hover` | Background hierarchy |
| Content | `--content-secondary`, `--content-muted` | Text hierarchy |
| Border | `--border`, `--ring` | Borders and focus rings |
| Primary | `--primary`, `--primary-foreground` | Primary actions |
| Status | `--success`, `--error`, `--warning` | State indicators |
| Input | `--input`, `--input-border` | Form elements |
| Chat | `--chat-user`, `--chat-tool-*` | Domain-specific |
| Overlay | `--overlay` | Modal backdrops |

**Rules:**
- All colors MUST come from CSS variables — no Tailwind color classes, no inline hex/rgba
- Dark mode is handled by `.dark` class toggling variable values
- Components use `style={{ color: 'var(--token)' }}` for theme-aware colors

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| CLI vs Agent SDK | CLI (`claude -p`) | SDK requires API key (extra cost), CLI uses Max subscription |
| Streaming format | `stream-json` NDJSON | Real-time events: tool calls, text, status — all in one stream |
| Session resume | `--resume SESSION_ID` | Context preserved across messages within same chat session |
| Project management | Import/remove model | User curates workspace — avoids noise from auto-detected projects |
| Session storage | JSON file | Simple, local, no DB dependency — fits single-user local tool |
| SSR | Disabled (`ssr: false`) | Local tool, no SEO/performance benefit from SSR |
| Color system | Semantic CSS variables | Single source of truth, auto dark mode, no Tailwind color leakage |
| Path validation | HOME boundary check | Prevents path traversal from localhost requests |

## Scripts

```bash
yarn dev          # Start dev server on port 3100
yarn build        # Production build
yarn start        # Production server on port 3100
yarn lint         # ESLint
```

## Rules

- **English only** in code, comments, docs (open source project)
- **No personal info** in committed files (paths, usernames, etc.)
- **Commit in small units** — one logical change per commit, get approval before committing
- **No SSR** — all page components are client-only
- **Local-only assumptions are OK** — this tool will never run in the cloud
- **No Tailwind color classes** — all colors via CSS variables in globals.css
- **Immutable data patterns** — no direct mutation, use spread/map

## Docs

- `docs/01-vision.md` — Project goal, target user, architecture, constraints
- `docs/02-phases.md` — 5-phase roadmap with checklist
- `NOTES.local.md` — Design notes, open questions (gitignored)
