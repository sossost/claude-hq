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

## Phase 2: Session Management (done)

**Core**: Manage multiple sessions and browse conversation history.

- [x] Sidebar with session list (scoped per project, slide navigation from projects view)
- [x] Switch between sessions (loads full message history, auto-selects most recent on project change)
- [x] Delete sessions (with active session cleanup)
- [ ] Search sessions
- [x] Session summaries (title, message count, relative time via `SessionSummary` type)

## Phase 3: Agent Visibility (in progress)

**Core**: See what sub-agents are doing at a glance.

- [ ] Detect Agent tool calls (`tool_use.name === "Agent"`)
- [x] Agent cards (name, model, category, source badge) — static catalog from `.claude/agents/` scanning
- [ ] Parallel agent visualization (concurrent execution)
- [ ] Tool call timeline (chronological activity)
- [ ] Agent tree (manager → sub-agent hierarchy)

> **Note**: Static agent catalog is implemented — agents are scanned from project-local
> (`.claude/agents/*.md`), global user (`~/.claude/agents/*.md`), and built-in definitions.
> Agents are grouped by category (planning, quality, build, maintenance, exploration) in a
> toggleable right panel. Runtime agent visibility (detecting live Agent tool calls during
> chat) is NOT yet implemented.

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
