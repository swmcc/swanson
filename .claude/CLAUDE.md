# CLAUDE.md

Project context for Claude Code.

## Overview

**Swanson** - A TUI for managing local development projects. Built with React + Ink (React renderer for CLI).

## Commands

```bash
make local.dev      # Run TUI in dev mode
make local.mcp      # Run MCP server in dev mode
make local.build    # Compile TypeScript
make local.link     # Build + link globally
```

## Architecture

```
src/
├── index.tsx              # Entry point
├── app.tsx                # Main app component
├── components/            # React/Ink UI components
│   ├── Splash.tsx         # Startup splash screen
│   ├── ProjectList.tsx    # Grid/list of projects
│   ├── ProjectDashboard.tsx  # Selected project view
│   ├── IssuesBrowser.tsx  # GitHub issues/PRs
│   └── LogViewer.tsx      # Process output viewer
├── hooks/
│   └── useTerminalSize.ts # Terminal dimensions
├── lib/                   # Core utilities
│   ├── projects.ts        # Project discovery
│   ├── makefile.ts        # Parse Makefile targets
│   ├── process.ts         # Spawn/manage processes
│   ├── github.ts          # gh CLI wrapper
│   ├── git.ts             # Git operations
│   └── lazygit.ts         # Lazygit launcher
└── mcp/                   # MCP server for Claude integration
    ├── index.ts           # MCP entry
    ├── server.ts          # Server setup
    └── tools/             # MCP tool handlers
```

## Stack

- **React + Ink** - Terminal UI rendering
- **TypeScript** - Type safety
- **Zustand** - State management
- **MCP SDK** - Claude Code integration

## Key Patterns

- Components are React functional components rendered to terminal via Ink
- `useInput()` hook for keyboard handling
- `lib/` contains pure utility functions (no React)
- MCP tools mirror lib functions for Claude access

## MCP Tools

| Tool | Purpose |
|------|---------|
| `swanson_list_projects` | List available projects |
| `swanson_list_targets` | Get Makefile targets for project |
| `swanson_start_process` | Run a make target |
| `swanson_stop_process` | Kill running process |
| `swanson_get_logs` | Get process output |
| `swanson_gh_issues` | List GitHub issues |
| `swanson_gh_prs` | List pull requests |
| `swanson_git_status` | Get git status |
