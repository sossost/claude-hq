# Decisions: Agent Task Dashboard

**Created:** 2026-03-26

## Technical Decisions

### 1. Display Location

| Option | Pros | Cons |
|--------|------|------|
| A: Extend existing AgentPanel with tabs | Reuses existing panel, no layout changes, natural grouping | Tab switching adds minor complexity |
| B: Inline in chat area | No panel needed, always visible | Clutters chat flow, hard to manage multiple agents |
| C: Separate bottom/side panel | Maximum visualization space | Layout complexity, more CSS, competes for screen space |

**Chosen:** A: Extend existing AgentPanel with tabs
**Reason:** Natural extension of the agent concept. Catalog = what agents exist, Workspace = what agents are doing. No layout restructuring needed.

---

### 2. Detail Level

| Option | Pros | Cons |
|--------|------|------|
| A: Summary only (name + status + time) | Clean, fast to scan, simple to implement | Less insight into what agent is doing |
| B: With tool call list | Shows concrete actions, debugging-friendly | More complex parsing, visual clutter |
| C: Full detail with results | Maximum transparency | Information overload, complex UI |

**Chosen:** A: Summary only
**Reason:** This is a monitoring dashboard, not a debugging tool. Users need to know "who's working" and "are they done", not every internal step. Tool call details can be added in v2.

---

### 3. Detection Method

| Option | Pros | Cons |
|--------|------|------|
| A: Stream parsing only | Zero new infrastructure, extends existing claudeProcess.ts | Can only detect start/end, no intermediate status |
| B: Stream + CLI polling | More accurate real-time status | Complex, requires CLI support for status queries |

**Chosen:** A: Stream parsing only
**Reason:** Start with the simplest approach. The stream already contains tool_use (agent start) and tool_result (agent end) events. Intermediate status can be added later if needed.

---

### 4. History Persistence

| Option | Pros | Cons |
|--------|------|------|
| A: Current session only (in-memory) | Simple, no storage logic, no cleanup | Lost on page refresh |
| B: Persist per session to disk | Reviewable history, survives refresh | Storage logic, data growth, cleanup needed |

**Chosen:** A: Current session only
**Reason:** This is a real-time monitoring tool. Past agent runs are visible in the chat history already. Adding persistence is premature complexity.

---

### 5. Visual Style

| Option | Pros | Cons |
|--------|------|------|
| A: Minimal management sim | Clean, fits existing design, management-game feel via KPI + progress bars | Less playful |
| B: Retro pixel art | Fun, distinctive, game-like | Clashes with existing design system, hard to maintain |

**Chosen:** A: Minimal management sim
**Reason:** Achieves the "tycoon" feel through layout patterns (KPI bar, worker cards, grid workspace) while maintaining visual consistency with the rest of Claude HQ.

---

### 6. Parallel Agent Display

| Option | Pros | Cons |
|--------|------|------|
| A: Grid workspace (cards in grid) | Tycoon feel, handles N agents, visual | Uses more vertical space |
| B: Simple list (running on top, done below) | Compact, easy to scan | Less visual, less game-like |
| C: Timeline bar (Gantt-style) | Shows temporal relationships | Complex to implement, overkill for v1 |

**Chosen:** A: Grid workspace
**Reason:** Core to the management sim aesthetic. Agents as independent "workers" in a grid feels like watching a factory floor. 2-column responsive grid handles typical 1-4 concurrent agents well.

---

### 7. Card Lifecycle Animation

| Option | Pros | Cons |
|--------|------|------|
| A: Fade in/out (appear on start, disappear after done) | Dynamic, cards come and go naturally | Need to handle timing for fade-out |
| B: Persist with state change (running → done, stay visible) | Full session history in panel | Gets crowded, less dynamic |

**Chosen:** A: Fade in/out
**Reason:** Cards appearing and disappearing creates the "living workspace" feel. Done cards show completion state for 3 seconds (enough to notice) then gracefully fade out. Error cards stay 5 seconds for visibility.

---

### 8. Auto Tab Switching

| Option | Pros | Cons |
|--------|------|------|
| A: Auto-switch to workspace tab on agent detection | User sees agents without manual action | Could be disruptive if browsing catalog |
| B: Manual only | User controls view | Might miss agent activity |

**Chosen:** A: Auto-switch (with constraint: only switches tab, does not open closed panel)
**Reason:** The whole point is visibility. If agents are running, the user should see them. Not auto-opening the panel respects the user's decision to hide the panel.

---

### 9. Model Information Display

| Option | Pros | Cons |
|--------|------|------|
| A: Hover tooltip | Clean card, info available on demand | Requires mouse interaction |
| B: Always visible text label | Immediately visible | Visual clutter on small cards |
| C: Hidden entirely | Simplest card | Loses useful context |

**Chosen:** A: Hover tooltip
**Reason:** Model info is nice-to-know, not need-to-know. Keeping cards clean while making info available on hover is the right tradeoff for a monitoring dashboard.

---

### 10. Agent Start/End Correlation

| Option | Pros | Cons |
|--------|------|------|
| A: Add toolUseId to ToolMessage, correlate in client hook | Accurate pairing, handles parallel agents, minimal backend change | Adds field to existing type |
| B: Sequential pairing (Nth result → Nth agent) | No type changes | Breaks with parallel agents, fragile |
| C: Dedicated AgentTaskMessage type | Clean separation | More message types, more SSE parsing |

**Chosen:** A: Add toolUseId to ToolMessage
**Reason:** The Claude CLI stream provides `tool_use.id` and `tool_result.tool_use_id` for exact correlation. Currently discarded in `claudeProcess.ts`. Preserving it enables reliable pairing even with parallel agent execution. Minimal change — one optional field on an existing type.

---

### 11. State Management Pattern

| Option | Pros | Cons |
|--------|------|------|
| A: Derived state hook (useAgentTasks) | Pure derivation from messages, no new state sync | Re-scans messages on each update |
| B: Separate state in Dashboard | Direct control | State duplication, sync issues |
| C: Emit from claudeProcess + forward via SSE | Server-driven, clean | More backend changes, new event type |

**Chosen:** A: Derived state hook
**Reason:** Agent tasks are a view of the existing message stream. A `useAgentTasks(messages)` hook scans for Agent ToolMessages, pairs start/end by toolUseId, and returns current task list. No state duplication, no backend changes beyond preserving toolUseId. Timer for elapsed time managed internally via `useEffect` interval.

---

### 12. Component Pattern

| Option | Pros | Cons |
|--------|------|------|
| A: AgentPanel wraps tab switch, delegates to AgentCatalog / AgentWorkspace | Clean separation, each sub-component focused | One more level of nesting |
| B: AgentPanel handles everything inline | Fewer files | Grows too large, violates SRP |

**Chosen:** A: AgentPanel as tab container
**Reason:** Follows existing project patterns (ChatPanel composes Messages + Input). AgentPanel becomes a thin wrapper that switches between catalog view (existing) and workspace view (new).

---

## Architecture

### Structure

```
src/
├── components/agent/
│   ├── index.ts                 ← export AgentPanel (unchanged public API)
│   ├── AgentPanel.tsx           ← tab container (catalog / workspace)
│   ├── AgentCard.tsx            ← existing catalog card (unchanged)
│   ├── AgentCatalog.tsx         ← extracted from current AgentPanel body
│   ├── AgentWorkspace.tsx       ← grid container + KPI bar + empty state
│   └── AgentTaskCard.tsx        ← runtime task card (status, progress, timer)
├── lib/
│   └── useAgentTasks.ts         ← derives AgentTask[] from ChatMessage[]
└── types/
    └── events.ts                ← add AgentTask type, toolUseId to ToolMessage
```

### Core Flow (Pseudo-code)

```
// Stream parsing (claudeProcess.ts)
parseEvent(assistant event)
  → for each tool_use block:
      if name === 'Agent':
        emit ToolMessage { toolName: 'Agent', toolUseId: block.id, input: block.input.description }
      else:
        emit ToolMessage { toolName: name, toolUseId: block.id, input: ... }

parseEvent(user event)
  → for each tool_result block:
      emit ToolMessage { toolName: '→ result', toolUseId: block.tool_use_id, output: ..., isError: ... }

// Client hook (useAgentTasks.ts)
useAgentTasks(messages, isRunning)
  → scan messages for toolName === 'Agent' → build startMap { toolUseId → AgentTask }
  → scan messages for toolName === '→ result' → match by toolUseId → mark done/error
  → unmatched starts → status: 'running'
  → useEffect interval (1s) → update elapsed times for running tasks
  → return { tasks, activeTasks, kpi: { active, done, error } }

// UI (AgentPanel.tsx)
AgentPanel({ agents, agentTasks, activeTab, onTabChange })
  → tab bar: [Catalog] [Workspace]
  → if catalog: <AgentCatalog agents={agents} />
  → if workspace: <AgentWorkspace tasks={agentTasks} />

// UI (AgentWorkspace.tsx)
AgentWorkspace({ tasks })
  → <KpiBar active={kpi.active} done={kpi.done} error={kpi.error} />
  → <div grid 2-col>
       {visibleTasks.map(task => <AgentTaskCard task={task} />)}
     </div>
  → if empty: "실행 중인 에이전트가 없습니다"

// UI (AgentTaskCard.tsx)
AgentTaskCard({ task })
  → status dot (green/gray/red)
  → agent name + description (truncated)
  → progress bar (indeterminate animation while running)
  → elapsed time (Xs)
  → CSS transition: fade-in on mount, fade-out on done (3s delay) / error (5s delay)
  → hover: tooltip with model, subagentType, full description

// Dashboard.tsx
Dashboard
  → useAgentTasks(messages, isRunning) → agentTasks
  → auto-switch tab when tasks.active > 0 (first detection only)
  → pass agentTasks to AgentPanel
```

### Key Interfaces

```typescript
// events.ts additions
type AgentTaskStatus = 'running' | 'done' | 'error'

interface AgentTask {
  id: string                // tool_use block id
  agentName: string         // from input.description or subagent_type
  description: string       // from input.prompt (truncated)
  status: AgentTaskStatus
  model?: string
  subagentType?: string
  startedAt: number
  completedAt?: number
  elapsedMs: number         // computed, updated by timer
}

interface AgentTaskKpi {
  active: number
  done: number
  error: number
}

// ToolMessage extended
interface ToolMessage {
  id: string
  role: 'tool'
  toolName: string
  toolUseId?: string        // NEW — for start/end correlation
  input: string
  output: string | null
  isError: boolean
  timestamp: number
}
```
