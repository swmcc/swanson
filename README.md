# Swanson

> "Give me all the services you have."

A no-nonsense TUI for managing local development services. Built with React and Ink.

## Features

- **Quick launcher** - Fuzzy search across all your projects
- **Service management** - Start/stop dev servers, databases, workers
- **Log viewer** - Tail logs from running services
- **Git integration** - Status, pull, branch operations
- **Makefile detection** - Auto-discovers `local.*` targets

## Installation

```bash
# Install dependencies
make local.install

# Run in development mode
make local.dev

# Or build and link globally
make local.link
swanson
```

## Usage

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ███████╗██╗    ██╗ █████╗ ███╗   ██╗███████╗ ██████╗ ███╗   ██╗   │
│  ██╔════╝██║    ██║██╔══██╗████╗  ██║██╔════╝██╔═══██╗████╗  ██║   │
│  ███████╗██║ █╗ ██║███████║██╔██╗ ██║███████╗██║   ██║██╔██╗ ██║   │
│  ╚════██║██║███╗██║██╔══██║██║╚██╗██║╚════██║██║   ██║██║╚██╗██║   │
│  ███████║╚███╔███╔╝██║  ██║██║ ╚████║███████║╚██████╔╝██║ ╚████║   │
│  ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝   │
│                                                                     │
│                  Give me all the services you have.                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate |
| `⏎` | Select project |
| `/` | Search |
| `Esc` | Back / Cancel |
| `q` | Quit |

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make local.dev` | Run TUI in development mode |
| `make local.build` | Compile TypeScript to dist/ |
| `make local.install` | Install npm dependencies |
| `make local.clean` | Remove dist/ and node_modules/ |
| `make local.link` | Build and link globally |
| `make local.test` | Run tests |

## Project Structure

```
swanson/
├── assets/
│   └── swanson.png
├── bin/
│   └── swanson.js
├── src/
│   ├── index.tsx
│   ├── app.tsx
│   ├── components/
│   │   ├── Splash.tsx
│   │   ├── ProjectList.tsx
│   │   ├── ProjectView.tsx
│   │   ├── LogViewer.tsx
│   │   └── GitPanel.tsx
│   ├── hooks/
│   │   ├── useProjects.ts
│   │   ├── useServices.ts
│   │   └── useGit.ts
│   └── lib/
│       ├── makefile.ts
│       ├── process.ts
│       └── config.ts
├── Makefile
├── package.json
└── tsconfig.json
```

## Tech Stack

- **React** - UI components
- **Ink** - React renderer for CLI
- **TypeScript** - Type safety
- **Zustand** - State management

## License

MIT
