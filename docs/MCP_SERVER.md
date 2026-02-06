# Swanson MCP Server

The Swanson MCP (Model Context Protocol) server allows you to manage your development projects directly from Claude Code. Start dev servers, check logs, view GitHub issues, and more - all through natural conversation.

## Installation

### Prerequisites

- Node.js 18+
- Claude Code CLI installed
- Swanson built and linked globally

### Setup

1. **Build and link Swanson**:
   ```bash
   cd /path/to/swanson
   make local.link
   ```

2. **Register with Claude Code**:
   ```bash
   claude mcp add --transport stdio swanson -- swanson-mcp
   ```

3. **Verify installation**:
   ```bash
   claude mcp list
   ```
   You should see `swanson` in the list.

4. **Restart Claude Code** to load the new MCP server.

### Alternative: Development Mode

For testing without linking globally:
```bash
claude mcp add --transport stdio swanson -- node /Users/swm/Code/swanson/dist/mcp/index.js
```

---

## Available Tools

### Project Management

#### `swanson_list_projects`
List all configured development projects.

**Parameters:** None

**Example prompts:**
- "What projects do I have configured?"
- "List all my projects"
- "Show me the Swanson projects"

**Response:**
```json
[
  {
    "name": "funeralsni",
    "path": "/Users/swm/Code/funeralsni",
    "icon": "⚱️",
    "color": "red",
    "description": "Funeral notices NI"
  },
  ...
]
```

---

#### `swanson_get_project`
Get details for a specific project.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Project name (e.g., 'funeralsni', 'jotter') |

**Example prompts:**
- "Tell me about the jotter project"
- "Get details for funeralsni"
- "What's the path for swanson?"

---

#### `swanson_list_targets`
List available make targets (local.*) for a project.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |

**Example prompts:**
- "What make targets does funeralsni have?"
- "List the available commands for jotter"
- "What can I run in swanson?"

**Response:**
```json
[
  {
    "name": "local.dev",
    "description": "Run the TUI in development mode",
    "phony": true
  },
  {
    "name": "local.build",
    "description": "Build TypeScript to dist/",
    "phony": true
  }
]
```

---

### Process Management

#### `swanson_start_process`
Start a make target as a background process.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |
| `target` | string | Yes | Make target (e.g., 'local.dev') |

**Example prompts:**
- "Start the dev server for funeralsni"
- "Run local.dev for jotter"
- "Start whatisonthe.tv in development mode"

**Response:**
```json
{
  "id": "funeralsni:local.dev",
  "name": "local.dev",
  "command": "make local.dev",
  "cwd": "/Users/swm/Code/funeralsni",
  "status": "running",
  "pid": 12345,
  "logCount": 15
}
```

**Notes:**
- The process runs in the background and persists between tool calls
- Use `swanson_get_logs` to see output
- Use `swanson_stop_process` to stop it

---

#### `swanson_stop_process`
Stop a running process.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `processId` | string | Yes | Process ID (format: 'projectName:target') |

**Example prompts:**
- "Stop the funeralsni dev server"
- "Kill the process for jotter:local.dev"
- "Stop funeralsni:local.dev"

---

#### `swanson_stop_all`
Stop all running processes.

**Parameters:** None

**Example prompts:**
- "Stop all running processes"
- "Kill everything"
- "Shut down all dev servers"

---

#### `swanson_list_processes`
List all running and tracked processes.

**Parameters:** None

**Example prompts:**
- "What's currently running?"
- "Show me all processes"
- "List active dev servers"

**Response:**
```json
[
  {
    "id": "funeralsni:local.dev",
    "name": "local.dev",
    "status": "running",
    "pid": 12345,
    "logCount": 150
  },
  {
    "id": "jotter:local.dev",
    "name": "local.dev",
    "status": "stopped",
    "logCount": 45
  }
]
```

---

#### `swanson_get_process`
Get status of a specific process.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `processId` | string | Yes | Process ID (format: 'projectName:target') |

**Example prompts:**
- "Is funeralsni still running?"
- "Check the status of jotter:local.dev"
- "What's the state of the funeralsni process?"

---

#### `swanson_get_logs`
Get logs for a process.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `processId` | string | Yes | Process ID (format: 'projectName:target') |
| `lines` | number | No | Number of lines to return (default: 500, max: 500) |

**Example prompts:**
- "Show me the logs for funeralsni"
- "Get the last 50 lines from jotter:local.dev"
- "What's the output from the dev server?"

**Notes:**
- Logs include both stdout and stderr
- Stderr lines are prefixed with `[stderr]`
- Logs persist even after a process stops (until the MCP server restarts)

---

### GitHub Integration

#### `swanson_gh_status`
Check if GitHub CLI is installed and authenticated for a project.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |

**Example prompts:**
- "Is GitHub configured for funeralsni?"
- "Check GitHub authentication for jotter"

---

#### `swanson_gh_issues`
List GitHub issues for a project.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |
| `state` | string | No | Filter: 'open', 'closed', or 'all' (default: 'open') |
| `limit` | number | No | Max issues to return (default: 30) |

**Example prompts:**
- "What GitHub issues are open for funeralsni?"
- "Show me all issues for jotter"
- "List the last 10 closed issues for swanson"

**Response:**
```json
[
  {
    "number": 1,
    "title": "Add MCP server for Claude integration",
    "state": "open",
    "createdAt": "2024-01-15T10:30:00Z",
    "author": "swmcc",
    "labels": ["enhancement"],
    "commentsCount": 2,
    "url": "https://github.com/swmcc/swanson/issues/1"
  }
]
```

---

#### `swanson_gh_issue`
Get detailed information about a specific issue.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |
| `issueNumber` | number | Yes | Issue number |

**Example prompts:**
- "Show me issue #1 for swanson"
- "Get details on funeralsni issue 42"
- "What's in jotter issue number 5?"

**Response includes:**
- Full issue body/description
- All comments with authors and timestamps
- Assignees and milestone
- Labels

---

#### `swanson_gh_prs`
List GitHub pull requests for a project.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |
| `state` | string | No | Filter: 'open', 'closed', or 'all' (default: 'open') |
| `limit` | number | No | Max PRs to return (default: 30) |

**Example prompts:**
- "What PRs are open for funeralsni?"
- "Show me pull requests for jotter"
- "List merged PRs for swanson"

**Response:**
```json
[
  {
    "number": 2,
    "title": "Add dark mode support",
    "state": "open",
    "author": "swmcc",
    "headBranch": "feature/dark-mode",
    "baseBranch": "main",
    "isDraft": false,
    "reviewDecision": "APPROVED",
    "url": "https://github.com/swmcc/project/pull/2"
  }
]
```

---

#### `swanson_gh_stats`
Get quick GitHub stats (open issues and PRs count).

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |

**Example prompts:**
- "How many open issues does funeralsni have?"
- "Give me a quick GitHub summary for jotter"
- "What's the issue/PR count for swanson?"

**Response:**
```json
{
  "openIssues": 5,
  "openPRs": 2
}
```

---

### Git Integration

#### `swanson_git_status`
Get git status for a project.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |

**Example prompts:**
- "What's the git status for funeralsni?"
- "Is jotter clean?"
- "What branch is swanson on?"

**Response:**
```json
{
  "branch": "main",
  "isClean": false,
  "ahead": 2,
  "behind": 0,
  "staged": 1,
  "unstaged": 3,
  "untracked": 2
}
```

---

#### `swanson_git_pull`
Pull latest changes for a project.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |

**Example prompts:**
- "Pull the latest for funeralsni"
- "Update jotter from remote"
- "Git pull swanson"

---

#### `swanson_git_fetch`
Fetch from remote without merging.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | string | Yes | Project name |

**Example prompts:**
- "Fetch updates for funeralsni"
- "Check if jotter has remote changes"

---

## Example Workflows

### Starting a Development Session

```
You: "What projects do I have?"
Claude: [Lists all 10 projects with descriptions]

You: "Start the dev server for funeralsni"
Claude: [Starts local.dev, reports PID and status]

You: "Show me the logs"
Claude: [Displays recent output from the server]

You: "What GitHub issues are open for it?"
Claude: [Lists open issues with titles and authors]
```

### Checking Project Status

```
You: "Give me a status report on jotter"
Claude: [Calls swanson_git_status, swanson_gh_stats]
"Jotter is on branch 'main', 2 commits ahead of remote.
There are 3 open issues and 1 open PR."

You: "What are those issues?"
Claude: [Calls swanson_gh_issues]
[Lists the 3 open issues]
```

### Managing Multiple Services

```
You: "Start dev servers for funeralsni and jotter"
Claude: [Starts both processes]

You: "What's running?"
Claude: [Lists both running processes with PIDs]

You: "Stop everything"
Claude: [Stops all processes]
```

### Debugging

```
You: "Start funeralsni and show me if there are any errors"
Claude: [Starts process, waits, checks logs for errors]

You: "Show me the last 100 lines of logs"
Claude: [Displays recent log output]

You: "Is it still running?"
Claude: [Checks process status]
```

---

## Troubleshooting

### MCP Server Not Found

```bash
# Check if swanson-mcp is in PATH
which swanson-mcp

# If not, rebuild and relink
cd /path/to/swanson
make local.link
```

### Tools Not Appearing

1. Restart Claude Code after adding the MCP server
2. Check the server is registered: `claude mcp list`
3. Test manually:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | swanson-mcp
   ```

### Process Won't Start

- Check the project has a Makefile with `local.*` targets
- Verify the project path exists
- Check for errors in the logs: `swanson_get_logs`

### GitHub Tools Failing

- Ensure `gh` CLI is installed: `gh --version`
- Authenticate: `gh auth login`
- Check the project is a GitHub repo: `gh repo view`

---

## Architecture

The MCP server reuses Swanson's existing library modules:

```
src/mcp/
├── index.ts        # Entry point, STDIO transport
├── server.ts       # Tool registration
└── tools/
    ├── projects.ts # Wraps lib/projects.ts
    ├── process.ts  # Wraps lib/process.ts (singleton)
    ├── github.ts   # Wraps lib/github.ts
    └── git.ts      # Wraps lib/git.ts
```

The `processManager` singleton maintains state between tool calls, so processes started via `swanson_start_process` persist until stopped or the MCP server exits.

---

## Configuration

The MCP server uses the same project configuration as the TUI. Projects are defined in `src/lib/projects.ts`. To add a new project, edit that file and rebuild.

---

## Limitations

- **No real-time log streaming**: Logs are fetched on-demand, not pushed
- **Single user**: The MCP server is designed for local, single-user use
- **Process state**: State is lost if the MCP server restarts
- **No Windows support**: Paths and process management are Unix-focused
