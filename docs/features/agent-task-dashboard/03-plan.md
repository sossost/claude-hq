# Implementation Plan: Agent Task Dashboard

**Status:** Draft
**Created:** 2026-03-26
**Spec:** ./01-spec.md

---

## Phase 1: Foundation [Estimated: S]

Types and stream parsing — the data layer.

- [ ] Add `AgentTask`, `AgentTaskStatus`, `AgentTaskKpi` types to `src/types/events.ts`
- [ ] Add optional `toolUseId` field to `ToolMessage` interface
- [ ] Modify `claudeProcess.ts` to preserve `toolUseId`:
  - `tool_use` blocks → pass `block['id']` as `toolUseId`
  - `tool_result` blocks → pass `block['tool_use_id']` as `toolUseId`
- [ ] For Agent tool_use specifically, extract richer `input` display:
  - Use `input.description` as primary display text
  - Fallback to existing display logic

**Verify:** TypeScript compiles, existing chat still works, toolUseId appears in Agent ToolMessages

---

## Phase 2: State Management [Estimated: M]

The `useAgentTasks` hook — derives task state from messages.

- [ ] Create `src/lib/useAgentTasks.ts`
- [ ] Scan messages for `toolName === 'Agent'` → build task start map (keyed by toolUseId)
- [ ] Scan messages for `toolName === '→ result'` → match by toolUseId → mark done/error
- [ ] Unmatched starts with isRunning=true → status 'running'
- [ ] Unmatched starts with isRunning=false → status 'done' (session ended)
- [ ] Compute KPI counters: `{ active, done, error }`
- [ ] Manage elapsed time via `setInterval(1000)` for running tasks
- [ ] Return `{ tasks, kpi, hasActiveTasks }`

**Verify:** Hook correctly derives tasks from mock message arrays (manual testing)

---

## Phase 3: UI Components [Estimated: M]

Card, workspace, and tab — the visual layer.

- [ ] Extract current AgentPanel body into `AgentCatalog.tsx` (pure refactor, no behavior change)
- [ ] Create `AgentTaskCard.tsx`:
  - Status dot (green=running, gray=done, red=error)
  - Agent name + description (1 line, truncated)
  - Indeterminate progress bar (CSS animation while running)
  - Elapsed time counter (`Xs` format)
  - Hover tooltip: model, subagentType, full description
  - CSS transitions: fade-in on mount, fade-out on removal
- [ ] Create `AgentWorkspace.tsx`:
  - KPI bar: `● N active  ✓ N done  ✗ N err`
  - 2-column responsive grid of AgentTaskCards
  - Empty state: "실행 중인 에이전트가 없습니다"
  - Manages fade-out timing (3s done, 5s error) before removing cards
- [ ] Modify `AgentPanel.tsx`:
  - Add tab bar: [Catalog] / [Workspace]
  - Tab state managed via prop from Dashboard (for auto-switch)
  - Catalog tab → `<AgentCatalog />`
  - Workspace tab → `<AgentWorkspace />`
- [ ] Add CSS for progress bar animation and card fade transitions to `globals.css`
- [ ] Update `index.ts` exports

**Verify:** Components render correctly with mock data, animations work, tabs switch

---

## Phase 4: Integration [Estimated: S]

Wire everything together in Dashboard.

- [ ] Add `useAgentTasks(messages, isRunning)` call in Dashboard
- [ ] Add `agentPanelTab` state ('catalog' | 'workspace')
- [ ] Auto-switch to 'workspace' tab when `hasActiveTasks` becomes true
- [ ] Pass tab state + tasks + kpi to AgentPanel
- [ ] Clear task state on session change (handled naturally — messages reset)
- [ ] Test full flow: send message → agent detected → card appears → completes → fades out

**Verify:** End-to-end flow works with real Claude CLI agent execution

---

## Dependencies

```
Phase 1 (types + parsing)
  └── Phase 2 (hook)
        └── Phase 3 (UI)
              └── Phase 4 (integration)
```

All phases are sequential — each builds on the previous.

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| toolUseId not available in stream | LOW | Claude CLI stream-json always includes tool_use.id — verified in type definitions |
| Parallel agents arrive out of order | LOW | toolUseId-based correlation handles any order |
| Adding toolUseId breaks existing ToolMessage consumers | LOW | Field is optional, no existing code reads it |
| Fade-out timing conflicts with rapid agent spawning | LOW | Each card manages its own lifecycle independently |
| Progress bar without real progress data | NONE | Indeterminate animation — no percentage needed |

## Estimated Complexity: M

~4 files modified, ~4 files created. No backend API changes, no new endpoints, no storage changes.
