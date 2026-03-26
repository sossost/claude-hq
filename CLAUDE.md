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
- **No external DB** — sessions stored in `~/.claude/dashboard/sessions.json`
- **No cloud deployment** — requires `claude` CLI on the same machine

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  ← Entry point (dynamic import, no SSR)
│   ├── layout.tsx                ← Root layout + theme init script
│   ├── globals.css               ← CSS variables for light/dark theme
│   └── api/
│       ├── chat/route.ts         ← Spawns claude CLI, streams SSE
│       ├── projects/route.ts     ← Lists projects from ~/.claude/projects/
│       └── sessions/route.ts     ← Session CRUD (GET/POST/PATCH/DELETE)
├── components/
│   ├── Dashboard.tsx             ← Main dashboard layout (client-only)
│   ├── ChatMessages.tsx          ← Message rendering (text, tool, status)
│   ├── ChatInput.tsx             ← Input with IME composition handling
│   └── ProjectSelector.tsx       ← Dropdown with search
├── lib/
│   ├── claudeProcess.ts          ← ClaudeSession class (spawn + parse stream-json)
│   ├── projectStore.ts           ← Scans ~/.claude/projects/, decodes folder names
│   ├── sessionStore.ts           ← Read/write sessions.json
│   ├── useChat.ts                ← Chat state + session persistence hook
│   ├── useProjects.ts            ← Project list fetch hook
│   └── useTheme.ts               ← Dark/light toggle hook
└── types/
    └── events.ts                 ← All type definitions (events, messages, project, session)
```

## Key Data Flow

1. User sends message → `POST /api/chat` with `{ prompt, cwd, claudeSessionId }`
2. Server spawns `claude -p` child process with stream-json output
3. Each NDJSON line is parsed into a `ChatMessage` and sent via SSE
4. Client receives SSE events and appends to message list
5. On completion, messages are persisted to `~/.claude/dashboard/sessions.json`
6. Next message sends `claudeSessionId` for `--resume` continuity

## Design Direction

**Modular dashboard, not a chat app.**

Current state is chat-centric (Phase 1 prototype). Target architecture:
- Each feature is an **independent widget/panel** (chat, agents, sessions, schedules)
- Board layout with collapsible/resizable panels
- Visual personality: agent avatars, depth/shadows, micro-animations for agent states
- See `NOTES.local.md` for detailed design notes (not in git)

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| CLI vs Agent SDK | CLI (`claude -p`) | SDK requires API key (extra cost), CLI uses Max subscription |
| Streaming format | `stream-json` NDJSON | Real-time events: tool calls, text, status — all in one stream |
| Session resume | `--resume SESSION_ID` | Context preserved across messages within same chat session |
| Project detection | `~/.claude/projects/` scan | Auto-detect, zero config — Claude Code creates these folders |
| Session storage | JSON file | Simple, local, no DB dependency — fits single-user local tool |
| SSR | Disabled (`ssr: false`) | Local tool, no SEO/performance benefit from SSR |

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

## Docs

- `docs/01-vision.md` — Project goal, target user, architecture, constraints
- `docs/02-phases.md` — 5-phase roadmap with checklist
- `NOTES.local.md` — Design notes, open questions (gitignored)
