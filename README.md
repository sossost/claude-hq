# Claude HQ

A local web dashboard that gives you visual control over Claude Code's agent system.

> **Status**: Phase 1–3.5 complete. Active development.

## What is this?

Claude HQ wraps the Claude Code CLI (`claude -p`) in a visual web interface. Instead of typing commands in a terminal, you interact with Claude agents through a chat UI — with real-time streaming, rich markdown rendering, project management, session persistence, and agent monitoring.

**This is a local tool.** It runs on the same machine as your Claude Code CLI and communicates through the CLI — no separate API key required.

## Features

- **Rich chat interface** — Markdown rendering, Shiki syntax highlighting, collapsible thinking/tool blocks, copy button on code blocks
- **Project management** — Import/remove projects from your Claude Code workspace, switch between them instantly
- **Session management** — Multiple sessions per project, full message history, auto-resume with `--resume`
- **Agent monitoring** — Real-time visibility into sub-agent execution (running/done/error), agent catalog from `.claude/agents/`
- **Slash commands** — `/clear`, `/new`, `/model`, `/effort`, `/permission` builtins + custom commands from `.claude/commands/`
- **Session settings** — Per-session model, effort level, and permission mode controls
- **Mobile responsive** — Overlay sidebar and panels on mobile viewports
- **Dark/light theme** — Manual toggle with semantic CSS variable system

## Quick Start

```bash
git clone https://github.com/your-username/claude-hq.git
cd claude-hq
yarn install
yarn dev
# Open http://localhost:3100
```

## Requirements

- Node.js 20+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Streaming**: SSE over NDJSON (`--output-format stream-json --verbose`)
- **Syntax highlighting**: Shiki (dual theme, github-light/github-dark)
- **Package manager**: Yarn 4 (Berry)
- **Language**: TypeScript (strict mode)

## How it works

```
Browser (client-only, no SSR)
    ↕ HTTP / SSE
Next.js API routes (local server)
    ↕ child_process.spawn
Claude Code CLI (claude -p)
    ↕ Anthropic API
Claude Model
```

The server spawns `claude -p` with `--output-format stream-json --verbose`, parses the NDJSON output, and streams it to the browser via SSE. Session continuity uses `--resume SESSION_ID`.

## Roadmap

See [docs/02-phases.md](docs/02-phases.md) for the full roadmap.

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Chat Interface | Done |
| 2 | Session Management | Done |
| 3 | Agent Visibility | Done |
| 3.5 | Session Settings & Polish | Done |
| 4 | Scheduling & Automation | Planned |
| 5 | Multi-project Operations | Planned |
| 6 | Customizable Layout | Planned |

## Scripts

```bash
yarn dev          # Start dev server on port 3100
yarn build        # Production build
yarn start        # Production server on port 3100
yarn lint         # ESLint
```

## License

MIT
