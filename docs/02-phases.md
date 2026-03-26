# Claude HQ — Phase Roadmap

## Phase 1: Chat Interface (current)

**Core**: Move the terminal `claude` conversation into a web chat UI.

- [x] Chat UI (send/receive messages)
- [x] Real-time streaming via SSE
- [x] Tool call visualization (tool name, input, output)
- [x] Session continuity (`--resume`)
- [x] Project selector (`~/.claude/projects/` scan)
- [x] Server-side session persistence (survives page refresh)
- [x] Dark/light theme toggle
- [x] Korean IME compatibility

## Phase 2: Session Management

**Core**: Manage multiple sessions and browse conversation history.

- [ ] Sidebar with session list (grouped by project)
- [ ] Switch between sessions
- [ ] Delete sessions
- [ ] Search sessions
- [ ] Session summaries (first message, last activity, turn count)

## Phase 3: Agent Visibility

**Core**: See what sub-agents are doing at a glance.

- [ ] Detect Agent tool calls (`tool_use.name === "Agent"`)
- [ ] Agent cards (name, status, description)
- [ ] Parallel agent visualization (concurrent execution)
- [ ] Tool call timeline (chronological activity)
- [ ] Agent tree (manager → sub-agent hierarchy)

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
