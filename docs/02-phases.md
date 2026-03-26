# Claude HQ — Phase Roadmap

## Phase 1: Chat Interface (done)

**Core**: Move the terminal `claude` conversation into a web chat UI.

- [x] Chat UI (send/receive messages)
- [x] Real-time streaming via SSE
- [x] Tool call visualization (tool name, input, output)
- [x] Session continuity (`--resume`)
- [x] Project selector (`~/.claude/projects/` scan)
- [x] Server-side session persistence (survives page refresh)
- [x] Dark/light theme toggle
- [x] Korean IME compatibility
- [x] Markdown rendering (react-markdown + remark-gfm)
- [x] Code syntax highlighting (Shiki, dual theme, copy button)
- [x] Thinking block display (collapsible, auto-expand while streaming)
- [x] Tool result collapsible (default collapsed, click to expand)
- [x] Empty state with project name and usage hint

## Phase 2: Session Management (done)

**Core**: Manage multiple sessions and browse conversation history.

- [x] Sidebar with session list (scoped per project, slide navigation from projects view)
- [x] Switch between sessions (loads full message history, auto-selects most recent on project change)
- [x] Delete sessions (with active session cleanup)
- [ ] Search sessions
- [x] Session summaries (title, message count, relative time via `SessionSummary` type)

## Phase 3: Agent Visibility (done)

**Core**: See what sub-agents are doing at a glance.

- [x] Detect Agent tool calls (`tool_use.name === "Agent"`)
- [x] Agent cards (name, model, category, source badge) — static catalog from `.claude/agents/` scanning
- [x] Parallel agent visualization (concurrent execution) — task grid with KPI bar in AgentWorkspace
- [ ] Tool call timeline (chronological activity)
- [ ] Agent tree (manager → sub-agent hierarchy)

> **Note**: Tool call timeline and agent tree hierarchy remain out of scope for now.

## Phase 4: Scheduling & Automation

**Core**: Set up and manage recurring tasks from the UI.

- [ ] Schedule CRUD interface
- [ ] node-cron or system cron integration
- [ ] Execution history (last run, success/failure)
- [ ] Per-project schedule groups

## Phase 5: Multi-project Operations

**Core**: Monitor and control multiple projects from a single screen.

- [ ] Per-project status dashboard
- [ ] Cross-project activity feed
- [ ] Per-project settings (default prompts, permission modes, etc.)

---

## Prioritization Principles

1. **Working software first** — Each phase must be independently useful
2. **Value over terminal** — If it's not better than the CLI, don't build it
3. **Incremental expansion** — Phase 1 alone should be worth using
