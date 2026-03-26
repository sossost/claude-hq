# Claude HQ

A local web dashboard for controlling Claude Code agent sessions.

> **Status**: Phase 1 (Chat Interface) — functional prototype

## What is this?

Claude HQ wraps the Claude Code CLI (`claude -p`) in a visual web interface. Instead of typing commands in a terminal, you interact with Claude agents through a chat UI — with real-time streaming, project switching, and session persistence.

**This is a local tool.** It runs on the same machine as your Claude Code CLI and uses your existing Max subscription. No additional API costs.

## Features

- **Chat interface** — Send messages, see responses and tool calls in real-time
- **Project switching** — Auto-detects your Claude Code projects, run sessions in any project directory
- **Session persistence** — Conversations survive page refresh
- **Dark/light theme** — Follows system preference or manual toggle

## Quick Start

```bash
cd dashboard
yarn install
yarn dev
# Open http://localhost:3100
```

## Requirements

- Node.js 20+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- Claude Max subscription

## How it works

```
Browser → Next.js server → child_process.spawn('claude', ['-p', ...]) → Claude CLI
```

The server spawns `claude -p` with `--output-format stream-json --verbose`, parses the NDJSON output, and streams it to the browser via SSE. Session continuity uses `--resume SESSION_ID`.

## Roadmap

See [docs/02-phases.md](docs/02-phases.md) for the full roadmap.

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Chat Interface | In progress |
| 2 | Session Management | Planned |
| 3 | Agent Visibility | Planned |
| 4 | Scheduling & Automation | Planned |
| 5 | Multi-project Operations | Planned |

## License

MIT
