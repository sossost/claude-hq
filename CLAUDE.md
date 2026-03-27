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
│       ├── sessions/route.ts     ← Session CRUD (GET/POST/PATCH/DELETE)
│       └── agents/route.ts       ← Agent catalog listing (GET with optional projectPath)
├── components/
│   ├── Dashboard.tsx             ← Layout orchestration (header + sidebar + agent panel + main)
│   ├── chat/                     ← Chat panel module
│   │   ├── index.ts              ← Public API (ChatPanel)
│   │   ├── ChatPanel.tsx         ← Composes Messages + Input
│   │   ├── ChatMessages.tsx      ← Message list + auto-scroll
│   │   ├── ChatInput.tsx         ← Input with IME composition handling
│   │   ├── ChatEmptyState.tsx    ← Empty state with project name + usage hint
│   │   ├── RunningIndicator.tsx  ← Running status dot
│   │   └── messages/             ← Per-type bubble components
│   │       ├── UserBubble.tsx
│   │       ├── AssistantBubble.tsx ← Markdown + ThinkingBlock integration
│   │       ├── ToolBubble.tsx     ← Collapsible tool calls (click to expand)
│   │       ├── MarkdownRenderer.tsx ← react-markdown wrapper with custom renderers
│   │       ├── CodeBlock.tsx      ← Shiki syntax highlighting + copy button
│   │       ├── ThinkingBlock.tsx  ← Collapsible thinking display
│   │       ├── StatusBubble.tsx
│   │       └── SystemBubble.tsx
│   ├── project/                  ← Project selector module
│   │   ├── index.ts              ← Public API (ProjectList)
│   │   ├── ProjectList.tsx       ← Sidebar project list
│   │   ├── ProjectItem.tsx       ← Project row with remove
│   │   └── ProjectImportDialog.tsx ← Import modal (portal-based, rendered to document.body)
│   ├── session/                  ← Session management module
│   │   ├── index.ts              ← Public API (SessionList)
│   │   ├── SessionList.tsx       ← Session list with back nav, new session button
│   │   └── SessionItem.tsx       ← Session row with title, message count, relative time
│   ├── settings/                 ← Session settings module
│   │   ├── index.ts              ← Public API (SettingsPanel)
│   │   └── SettingsPanel.tsx     ← Popover with model/effort/permission controls
│   └── agent/                    ← Agent catalog + task dashboard module
│       ├── index.ts              ← Public API (AgentPanel)
│       ├── AgentPanel.tsx        ← Stacks AgentWorkspace (when active) above AgentCatalog (always visible)
│       ├── AgentCatalog.tsx      ← Extracted catalog view grouped by category
│       ├── AgentWorkspace.tsx    ← Grid workspace with KPI bar (running/done/error counts)
│       ├── AgentTaskCard.tsx     ← Runtime task card with status, progress, fade-in/out animation
│       └── AgentCard.tsx         ← Agent card with avatar, model color, source badge
├── lib/
│   ├── claudeProcess.ts          ← ClaudeSession class (spawn + parse stream-json)
│   ├── pathValidator.ts          ← Path traversal prevention (HOME boundary)
│   ├── projectStore.ts           ← Scans ~/.claude/projects/, decodes folder names
│   ├── workspaceStore.ts         ← Imported projects CRUD (workspace.json)
│   ├── sessionStore.ts           ← Session persistence (sessions.json)
│   ├── agentStore.ts             ← Scans .claude/agents/ dirs, parses MD frontmatter, built-in agents
│   ├── useChat.ts                ← Chat state + SSE streaming hook
│   ├── useProjects.ts            ← Project list + import/remove hook
│   ├── useSessions.ts            ← Session CRUD + active session tracking hook
│   ├── useAgents.ts              ← Agent catalog fetching hook (per-project)
│   ├── useAgentTasks.ts          ← Derives AgentTask[] from ChatMessage[] (running/done/error)
│   └── useTheme.ts               ← Dark/light toggle hook
└── types/
    └── events.ts                 ← All type definitions (events, messages, project, session, agent)
```

> `src/components/chat/messages/safeContent.ts` — Defensive content rendering utility (safe extraction of text from unknown message shapes)

## Chat Rendering

Assistant messages are rendered with rich formatting:

- **Markdown**: `react-markdown` + `remark-gfm` — headings, bold/italic, lists, links, tables, blockquotes, code blocks
- **Syntax highlighting**: `Shiki` with singleton highlighter — dual theme (github-light / github-dark), auto-switches with app theme via shared `useSyncExternalStore` observer
- **Code blocks**: language label, hover copy button, DOMPurify sanitization on Shiki output, max-height with scroll
- **Thinking blocks**: collapsible (default collapsed), auto-expands while streaming, auto-collapses on completion
- **Tool calls**: collapsible (default collapsed), click header to expand input/output, error state with red dot indicator
- **Empty state**: shows project name + "Ask anything about this project." + "Enter to send"

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ☰ Claude HQ   project-name   [Running] [model] [D/L] [Agents] [⚙] │
├────────────┬─────────────────────────┬──────────────────────┤
│ PROJECTS   │                         │ AGENTS               │
│ > project1 │     Chat Messages       │ ┌ Workspace (active) ┐│
│   project2 │                         │ │ [2 running][1 done]││
│            │                         │ │ [task-A] [task-B]  ││
│ (+ Import) │                         │ └────────────────────┘│
│            │                         │ ── Planning ──       │
│            ├─────────────────────────┤ [planner] [architect]│
│ ← SESSIONS │  Chat Input             │ ── Quality ──        │
│  session-1 │                         │ [code-reviewer] ...  │
│  session-2 │                         │ [project badge]      │
└────────────┴─────────────────────────┴──────────────────────┘
```

- Sidebar: collapsible, slides between projects view and sessions view
  - Projects view: imported projects list + import button
  - Sessions view: per-project session list with back navigation, new session button
  - Slide transition: `translateX` animation between the two views
- Chat panel: self-contained module (messages + input), fills remaining width
- Agent panel: right side, toggleable, 40% width (min 20rem, max 36rem)
  - Stacked layout: AgentWorkspace (top, only when tasks are present) above AgentCatalog (always visible)
  - Workspace: KPI bar (running/done/error counts) + task cards in a responsive grid
  - Task cards: fade in on spawn, fade out after completion; show agent name, status, and progress
  - Catalog: agents grouped by category (planning, quality, build, maintenance, exploration)
  - Displays project-local agents with "project" badge
- Header: sidebar toggle, project name, running indicator, model badge, theme toggle, agent panel toggle, settings popover

## Key Data Flow

### Chat
1. User sends message → `POST /api/chat` with `{ prompt, cwd, claudeSessionId, settings }`
2. Server validates path (`assertSafePath`) and spawns `claude -p` child process with settings flags (`--model`, `--effort`, `--permission-mode`)
3. Each NDJSON line is parsed into a `ChatMessage` and sent via SSE
   - `text` blocks → `AssistantMessage.content`
   - `thinking` blocks → `AssistantMessage.thinking` (optional field)
   - `tool_use` blocks → `ToolMessage` with toolName and input
4. Client receives SSE events, merges consecutive assistant chunks (500ms window, includes thinking)
5. `AssistantBubble` renders content via `MarkdownRenderer` → `react-markdown` → custom `CodeBlock` (Shiki)
6. On completion, messages are persisted to `~/.claude/dashboard/sessions.json`
7. Next message sends `claudeSessionId` for `--resume` continuity

### Session Management
1. Sessions are scoped per project — switching projects clears stale sessions immediately, then fetches
2. `useSessions` hook fetches summaries from `/api/sessions` and filters by `projectPath`
3. Selecting a session loads its full messages via `selectSession(id)` → `loadSession()`
4. Creating a new session clears chat state and resets `activeSessionId`
5. After chat completes, session list is auto-refreshed (title may have been updated)
6. Most recent session is auto-selected when switching projects (guarded by `activeSessionId` + `userClearedRef` to avoid stale loads and respect explicit "New Session" clicks)

### Agent Catalog
1. Dashboard mounts `useAgents({ projectPath })` — fetches on project change
2. `GET /api/agents?projectPath=...` calls `listAgents()` in `agentStore`
3. Agent store scans three sources in order:
   - Project-local: `<projectPath>/.claude/agents/*.md` (frontmatter parsed)
   - Global user: `~/.claude/agents/*.md` (skipped if project has its own agents)
   - Built-in: hardcoded defaults (general-purpose, Explore, Plan, claude-code-guide, statusline-setup)
4. Each `.md` file is parsed for YAML frontmatter fields: `name`, `description`, `model`, `tools`
5. Category is derived from name lookup table or description keyword matching
6. Agent panel displays agents grouped by category with model-colored avatars

### Agent Task Monitoring
1. `claudeProcess` detects `tool_use` events where `name === 'Agent'` and preserves `toolUseId` for correlation
2. `useAgentTasks` hook derives `AgentTask[]` from the full `ChatMessage[]` array — no extra API calls
   - A task is `running` when a `tool_use` (Agent) event has no matching `tool_result` yet
   - A task transitions to `done` or `error` when the correlated `tool_result` arrives
3. `AgentWorkspace` renders the active task list as a responsive card grid with a KPI bar (running / done / error counts) at the top
4. `AgentTaskCard` fades in when a task spawns and fades out after completion, giving a live sense of parallel execution

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
| Sidebar navigation | Slide transition (translateX) | Smooth switch between projects and sessions without route change |
| Agent catalog | Static file scanning | Reads `.md` frontmatter from `.claude/agents/` dirs — no runtime process needed |
| Agent panel | Toggleable right panel (40% width) | Non-intrusive — user controls visibility; does not shrink chat below usable width |
| Agent task detection | Stream parsing (`tool_use.name === 'Agent'` with `toolUseId` correlation) | Zero extra API calls — task state is fully derived from the existing SSE message stream |
| Agent panel layout | Stacked (workspace on top when active, catalog always below) | No tabs needed — workspace appears only when tasks exist; catalog is always accessible |
| Import dialog | Portal-based (`createPortal` to `document.body`) | Avoids z-index/overflow issues from sidebar containment |
| Session scoping | Filter by `projectPath` client-side | Single sessions API, no per-project endpoints — keeps API surface minimal |
| Markdown rendering | `react-markdown` + `remark-gfm` | React-native components, custom renderers for code blocks and links |
| Syntax highlighting | `Shiki` singleton + DOMPurify | VS Code-grade accuracy, dual theme (github-light/dark), sanitized output |
| Theme observation | Shared `useSyncExternalStore` | Single MutationObserver for all CodeBlock instances instead of N observers |
| Thinking display | Collapsible, default collapsed | Non-intrusive — auto-expands during streaming, collapses on completion |
| Tool display | Collapsible, default collapsed | Keeps chat flow clean — tool name visible, details on demand |
| Session auto-select | `activeSessionId` + `userClearedRef` guard | Prevents stale session loading on project switch while respecting explicit clears |
| Session settings | CLI flags (`--model`, `--effort`, `--permission-mode`) | Per-invocation flags — only affects this dashboard's requests, not global CLI config |

## Scripts

```bash
yarn dev          # Start dev server on port 3100
yarn build        # Production build
yarn start        # Production server on port 3100
yarn lint         # ESLint
```

## Code Quality Checklist (MANDATORY)

Every line of code MUST pass these checks. No exceptions.

### Explicit Intent
- `data == null` NOT `!data` — NEVER use implicit falsy coercion
- `res.ok === false` NOT `!res.ok` — even for booleans, be explicit
- `existsSync(path) === false` NOT `!existsSync(path)`
- `Array.isArray(x) === false` NOT `!Array.isArray(x)`
- Named constants for ALL numbers: `const MAX_RETRIES = 5` NOT bare `5`
- Boolean names as yes/no questions: `isLoading`, `hasData`, `canSubmit`

### Type Safety
- NEVER use `as` casts on external data (API responses, CLI output, JSON.parse)
- ALWAYS validate at boundaries with runtime checks: `typeof x === 'string'`, `Array.isArray(x)`
- Use Zod schemas or guard functions for complex shapes
- Discriminated unions over boolean flags: `status: 'success' | 'error'` NOT `isError: boolean`

### Security
- ALWAYS throw on missing `HOME` env var — NEVER fallback to `''`
- NEVER expose internal paths or stack traces in error messages returned to clients
- Validate ALL external input with runtime checks before use

### Accessibility
- ALL interactive elements need `aria-label` (buttons, toggles, close buttons)
- Collapsible elements need `aria-expanded`
- Lists need `role="list"` / `role="listitem"` or `<ul>`/`<li>`
- Live regions (chat messages) need `role="log"` + `aria-live="polite"`
- Custom dropdowns need `role="listbox"` + keyboard navigation (Arrow keys)

### Single Responsibility
- One function does ONE thing — max 50 lines
- One hook manages ONE concern — compose hooks for complex behavior
- One component renders ONE concept — extract when > 200 lines
- God components/hooks MUST be decomposed

### Declarative Patterns
- `.filter().map()` NOT `for...of` + `push`
- `Promise.all(items.map(...))` NOT sequential `for` loop with `await`
- React: Suspense + ErrorBoundary, NOT manual loading/error state

### API Response Format
- ALL routes MUST use `{ success: boolean, data?: T, error?: { code, message } }`
- No bare `{ sessions }`, `{ agents }` — always wrap in the envelope

### Production Hygiene
- ZERO `console.log` / `console.error` in production code
- No `setTimeout` without cleanup (store timer ID, clear on unmount)
- No `useEffect` for derived state — compute directly or use `useMemo`

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
