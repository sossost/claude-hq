# Feature Spec: Agent Task Dashboard

**Status:** Confirmed
**Created:** 2026-03-26
**Author:** brainstorm session

---

## Overview

채팅 중 실행되는 에이전트들의 작업 현황을 경영 시뮬레이션 게임 느낌의 그리드 워크스페이스로 실시간 모니터링하는 대시보드 모듈. 기존 AgentPanel을 확장하여 [카탈로그] / [작업 현황] 탭으로 구성한다.

## User Goals

- As a Claude HQ user, I want to see which agents are running in real-time so that I can understand what Claude is doing behind the scenes.
- As a Claude HQ user, I want a visual workspace that shows agents working simultaneously so that parallel execution feels tangible and manageable.

## Behavior

### Happy Path

1. User sends a chat message that triggers agent spawning
2. Stream parser detects `tool_use` with `name === 'Agent'` in the response
3. AgentPanel automatically switches to "작업 현황" tab
4. A new agent card fades in on the grid workspace
5. Card displays: agent name, description, running status, progress bar, elapsed time
6. While running, elapsed time updates in real-time (1s interval)
7. When agent completes (tool_result received), card transitions to "done" state
8. After 3 seconds in "done" state, card fades out and is removed
9. KPI counters at the top update throughout: active / done / error counts
10. User can hover any card to see additional info (model, subagent_type)
11. When all agents finish and fade out, empty state message is shown

### Tab Switching

- Agent detected while on "카탈로그" tab → auto-switch to "작업 현황" tab
- Agent detected while panel is closed → do NOT auto-open the panel
- User can manually switch between tabs at any time
- Tab state resets when session changes

### Error Cases

- **Agent fails (is_error: true in tool_result):** Card shows "error" state with red indicator, fades out after 5 seconds (longer than done to be noticeable)
- **Chat session ends while agents running:** All running cards transition to "done" state and fade out
- **Stream disconnects unexpectedly:** Running cards remain in "running" state until session reset

### Edge Cases

| Situation | Expected Behavior |
|-----------|-------------------|
| No agents in current session | Empty state: "실행 중인 에이전트가 없습니다" |
| 5+ agents running simultaneously | Grid wraps to multiple rows, scrollable |
| Same agent type spawned twice | Both shown as separate cards with unique IDs |
| Very long agent description | Truncate with ellipsis (single line) |
| Agent completes in < 1 second | Still shows card briefly (minimum 1s visible) then fade out |
| User switches session while agents shown | Cards cleared, fresh state for new session |
| Panel is closed when agents run | Cards accumulate in background, visible when panel opens |

## Interface Design

### Agent Task State

```typescript
type AgentTaskStatus = 'running' | 'done' | 'error'

interface AgentTask {
  id: string                    // unique per tool_use (tool_use block id)
  agentName: string             // from input.description or input.subagent_type
  description: string           // from input.prompt (truncated)
  status: AgentTaskStatus
  model?: string                // from input.model
  subagentType?: string         // from input.subagent_type
  startedAt: number             // timestamp
  completedAt?: number          // timestamp
}
```

### KPI Counters

```
● {active} active   ✓ {done} done   ✗ {error} err
```

- Counts are cumulative within the current session
- Active count decreases as agents complete
- Done/error counts only increase

### Card Layout

```
┌─────────────────────┐
│ ● {agentName}       │   ← status dot (green=running, gray=done, red=error)
│ {description}       │   ← truncated to 1 line
│ ████████░░░░  {Xs}  │   ← animated progress bar + elapsed time
└─────────────────────┘
```

- Grid: 2 columns (responsive, 1 column if panel narrow)
- Gap: consistent spacing between cards
- Progress bar: indeterminate animation while running (no real percentage available)
- Hover tooltip: model, subagent_type, full description

### Component Structure

- `AgentPanel` — adds tab switcher (카탈로그 / 작업 현황)
- `AgentWorkspace` — workspace container with KPI bar + grid
- `AgentTaskCard` — individual agent card with status, progress, timer
- `AgentKpiBar` — active/done/error counters

## Acceptance Criteria

- [ ] Agent tool_use events are detected from the chat stream
- [ ] Cards appear (fade-in) when an agent starts
- [ ] Cards show agent name, description, status, and elapsed time
- [ ] Progress bar animates while agent is running
- [ ] Cards transition to done/error state when tool_result arrives
- [ ] Done cards fade out after 3 seconds, error cards after 5 seconds
- [ ] KPI counters accurately reflect active/done/error counts
- [ ] Auto-switch to 작업 현황 tab when first agent detected
- [ ] Hover shows additional info (model, type)
- [ ] Empty state shown when no agents are active
- [ ] Cards cleared when session changes
- [ ] Grid layout handles 1-6+ concurrent agents gracefully

## Scope

**In Scope:**
- Runtime detection of Agent tool_use from stream-json
- Grid workspace UI with cards, KPI, fade animations
- Tab integration into existing AgentPanel
- Auto-tab-switch on agent detection
- Hover tooltip for additional info
- Elapsed time counter (1s interval)

**Out of Scope:**
- Persisting agent task history to disk
- Timeline/Gantt chart visualization
- Agent parent-child tree hierarchy
- Individual tool call details within agents
- Auto-opening the agent panel when closed
- Sound effects or notifications
- Agent control (stop/restart)

## Open Questions

- [ ] None — all decisions resolved in brainstorm
