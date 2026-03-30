# Contributing to Claude HQ

Thank you for your interest in contributing!

## Development Setup

**Requirements**: Node.js 20+, Yarn 4, Claude Code CLI installed and authenticated.

```bash
git clone https://github.com/sossost/claude-hq.git
cd claude-hq
yarn install
yarn dev
# Open http://localhost:3100
```

## Before You Start

- Check [existing issues](https://github.com/sossost/claude-hq/issues) to avoid duplicates.
- For significant changes, open an issue first to discuss the approach.
- Keep PRs focused — one logical change per PR.

## Pull Request Guidelines

- Branch from `main`: `feature/my-feature`, `fix/my-bug`
- Write clear commit messages (see format below)
- Keep PRs small (< 400 lines changed)
- Make sure `yarn build` and `yarn lint` pass

### Commit Format

```
feat: add agent task filtering
fix: prevent duplicate session creation
refactor: extract chat message normalization
docs: update quick start instructions
```

## Code Standards

This project enforces strict code quality. Key rules:

- **Explicit intent**: `data == null` not `!data`, named constants not magic numbers
- **No Tailwind color classes**: all colors via CSS variables in `globals.css`
- **No `console.log`** in production code
- **All interactive elements** need `aria-label`
- **API responses** must use `{ success: boolean, data?, error? }` envelope

See `CLAUDE.md` for the full standard.

## Reporting Bugs

Use the [bug report template](https://github.com/sossost/claude-hq/issues/new?template=bug_report.md).

## Suggesting Features

Use the [feature request template](https://github.com/sossost/claude-hq/issues/new?template=feature_request.md).
