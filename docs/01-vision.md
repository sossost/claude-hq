# Claude HQ — Project Vision

## One-liner

A local web dashboard that gives you visual control over Claude Code's agent system.

## Problem

Claude Code is powerful but trapped in the terminal.

- When 5 agents run in parallel, you can't tell what's happening from scrolling text
- Non-developers can't access the terminal at all
- Session history gets buried in scroll buffer
- Scheduling and project switching depend on CLI commands and memorized flags

## Goal

**A web interface that provides full control over Claude Code agents — without opening a terminal.**

- **Control, not monitoring** — issue commands, see results, decide next actions
- **Domain-independent** — works with any Claude Code project
- **Accessible** — anyone can operate an agent system, not just CLI power users

## Non-Goals

- Calling the Claude API directly (CLI wrapper only, uses Max subscription)
- Cloud deployment (local-only — requires `claude` CLI on the same machine)
- Reimplementing Claude Code features (this is a wrapper, not a replacement)
- Multi-tenant access (single user, single machine)

## Target User

1. **Primary**: Developers who use Claude Code daily and manage agent orchestration
2. **Secondary**: Non-developers who need to operate agent systems without terminal access

## Technical Foundation (Validated)

| Mechanism | Method | Status |
|---|---|---|
| Agent execution | `claude -p` child process | Validated |
| Real-time streaming | `--output-format stream-json --verbose` | Validated |
| Session continuity | `--resume SESSION_ID` | Validated |
| Project switching | `cwd` parameter + `~/.claude/projects/` scan | Validated |
| Cost | Included in Max subscription (no additional charges) | Confirmed |

## Architecture

```
Browser (Next.js)
    ↕ HTTP / SSE
Local Server (Node.js, same machine)
    ↕ child_process.spawn
Claude Code CLI (claude -p)
    ↕ Claude API (Max subscription)
Claude Model
```

Strictly local. Server and CLI run on the same machine.
For remote access, expose via Tailscale or Cloudflare Tunnel.

## Constraints

- **CLI dependency**: Requires `claude` binary installed and authenticated
- **Local only**: Cannot run in serverless/cloud environments
- **Single user**: Not multi-tenant (your machine, your sessions)
- **Max subscription**: API key billing mode is not supported
