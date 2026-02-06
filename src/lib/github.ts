import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Types for GitHub data
export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  author: string;
  labels: string[];
  commentsCount: number;
  url: string;
}

export interface GitHubIssueDetail extends GitHubIssue {
  body: string;
  comments: GitHubComment[];
  assignees: string[];
  milestone?: string;
}

export interface GitHubComment {
  author: string;
  body: string;
  createdAt: string;
}

export interface GitHubRepo {
  owner: string;
  name: string;
  fullName: string;
  url: string;
}

export type IssueState = 'open' | 'closed' | 'all';

export interface GitHubError {
  type: 'not_installed' | 'not_authenticated' | 'not_github_repo' | 'network' | 'unknown';
  message: string;
}

export type GitHubResult<T> =
  | { success: true; data: T }
  | { success: false; error: GitHubError };

/**
 * GitHub CLI abstraction layer
 * Wraps `gh` commands with typed interfaces
 */
export class GitHub {
  private cwd: string;
  private repoCache: GitHubRepo | null = null;

  constructor(projectPath: string) {
    this.cwd = projectPath;
  }

  /**
   * Check if gh CLI is installed and authenticated
   */
  async checkStatus(): Promise<GitHubResult<{ installed: boolean; authenticated: boolean }>> {
    try {
      // Check if gh is installed
      await execAsync('which gh');

      // Check if authenticated
      const { stdout } = await execAsync('gh auth status 2>&1', { cwd: this.cwd });
      const authenticated = stdout.includes('Logged in');

      return { success: true, data: { installed: true, authenticated } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('which:') || message.includes('not found')) {
        return {
          success: false,
          error: { type: 'not_installed', message: 'GitHub CLI (gh) is not installed' }
        };
      }

      if (message.includes('not logged in')) {
        return {
          success: true,
          data: { installed: true, authenticated: false }
        };
      }

      return { success: true, data: { installed: true, authenticated: true } };
    }
  }

  /**
   * Get the GitHub repo for the current project
   */
  async getRepo(): Promise<GitHubResult<GitHubRepo>> {
    if (this.repoCache) {
      return { success: true, data: this.repoCache };
    }

    try {
      const { stdout } = await execAsync(
        'gh repo view --json owner,name,url',
        { cwd: this.cwd }
      );

      const data = JSON.parse(stdout);
      this.repoCache = {
        owner: data.owner.login,
        name: data.name,
        fullName: `${data.owner.login}/${data.name}`,
        url: data.url,
      };

      return { success: true, data: this.repoCache };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not a git repository')) {
        return {
          success: false,
          error: { type: 'not_github_repo', message: 'Not a git repository' }
        };
      }

      if (message.includes('Could not resolve')) {
        return {
          success: false,
          error: { type: 'not_github_repo', message: 'Not a GitHub repository' }
        };
      }

      return {
        success: false,
        error: { type: 'unknown', message }
      };
    }
  }

  /**
   * List issues for the repository
   */
  async listIssues(state: IssueState = 'open', limit = 30): Promise<GitHubResult<GitHubIssue[]>> {
    try {
      const stateArg = state === 'all' ? '' : `--state ${state}`;
      const { stdout } = await execAsync(
        `gh issue list ${stateArg} --limit ${limit} --json number,title,state,createdAt,updatedAt,author,labels,comments,url`,
        { cwd: this.cwd }
      );

      const issues = JSON.parse(stdout);

      return {
        success: true,
        data: issues.map((issue: any) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state.toLowerCase(),
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          author: issue.author?.login || 'unknown',
          labels: issue.labels?.map((l: any) => l.name) || [],
          commentsCount: issue.comments?.length || 0,
          url: issue.url,
        })),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get issue counts by state
   */
  async getIssueCounts(): Promise<GitHubResult<{ open: number; closed: number }>> {
    try {
      const [openResult, closedResult] = await Promise.all([
        execAsync('gh issue list --state open --json number | jq length', { cwd: this.cwd }),
        execAsync('gh issue list --state closed --limit 1000 --json number | jq length', { cwd: this.cwd }),
      ]);

      return {
        success: true,
        data: {
          open: parseInt(openResult.stdout.trim(), 10) || 0,
          closed: parseInt(closedResult.stdout.trim(), 10) || 0,
        },
      };
    } catch {
      // Fallback: just count from list
      try {
        const openIssues = await this.listIssues('open', 100);
        const closedIssues = await this.listIssues('closed', 100);

        return {
          success: true,
          data: {
            open: openIssues.success ? openIssues.data.length : 0,
            closed: closedIssues.success ? closedIssues.data.length : 0,
          },
        };
      } catch (error) {
        return this.handleError(error);
      }
    }
  }

  /**
   * Get detailed view of a single issue
   */
  async getIssue(issueNumber: number): Promise<GitHubResult<GitHubIssueDetail>> {
    try {
      const { stdout } = await execAsync(
        `gh issue view ${issueNumber} --json number,title,state,body,createdAt,updatedAt,author,labels,comments,assignees,milestone,url`,
        { cwd: this.cwd }
      );

      const issue = JSON.parse(stdout);

      return {
        success: true,
        data: {
          number: issue.number,
          title: issue.title,
          state: issue.state.toLowerCase(),
          body: issue.body || '',
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          author: issue.author?.login || 'unknown',
          labels: issue.labels?.map((l: any) => l.name) || [],
          commentsCount: issue.comments?.length || 0,
          comments: issue.comments?.map((c: any) => ({
            author: c.author?.login || 'unknown',
            body: c.body || '',
            createdAt: c.createdAt,
          })) || [],
          assignees: issue.assignees?.map((a: any) => a.login) || [],
          milestone: issue.milestone?.title,
          url: issue.url,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueNumber: number, body: string): Promise<GitHubResult<void>> {
    try {
      // Escape the body for shell
      const escapedBody = body.replace(/'/g, "'\\''");
      await execAsync(
        `gh issue comment ${issueNumber} --body '${escapedBody}'`,
        { cwd: this.cwd }
      );

      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Close an issue
   */
  async closeIssue(issueNumber: number, comment?: string): Promise<GitHubResult<void>> {
    try {
      const commentArg = comment ? `--comment '${comment.replace(/'/g, "'\\''")}'` : '';
      await execAsync(
        `gh issue close ${issueNumber} ${commentArg}`,
        { cwd: this.cwd }
      );

      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Reopen an issue
   */
  async reopenIssue(issueNumber: number): Promise<GitHubResult<void>> {
    try {
      await execAsync(
        `gh issue reopen ${issueNumber}`,
        { cwd: this.cwd }
      );

      return { success: true, data: undefined };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(title: string, body?: string): Promise<GitHubResult<GitHubIssue>> {
    try {
      const bodyArg = body ? `--body '${body.replace(/'/g, "'\\''")}'` : '';
      const { stdout } = await execAsync(
        `gh issue create --title '${title.replace(/'/g, "'\\''")}' ${bodyArg} --json number,title,state,createdAt,url`,
        { cwd: this.cwd }
      );

      const issue = JSON.parse(stdout);

      return {
        success: true,
        data: {
          number: issue.number,
          title: issue.title,
          state: 'open',
          createdAt: issue.createdAt,
          updatedAt: issue.createdAt,
          author: 'me',
          labels: [],
          commentsCount: 0,
          url: issue.url,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Open issue in browser
   */
  async openInBrowser(issueNumber: number): Promise<GitHubResult<void>> {
    return new Promise((resolve) => {
      const proc = spawn('gh', ['issue', 'view', String(issueNumber), '--web'], {
        cwd: this.cwd,
        detached: true,
        stdio: 'ignore',
      });

      proc.unref(); // Allow parent to exit independently

      proc.on('error', (err) => {
        resolve({
          success: false,
          error: { type: 'unknown', message: err.message }
        });
      });

      // Don't wait for it to close, browser will open async
      setTimeout(() => {
        resolve({ success: true, data: undefined });
      }, 100);
    });
  }

  /**
   * Open repo in browser
   */
  async openRepoInBrowser(): Promise<GitHubResult<void>> {
    return new Promise((resolve) => {
      const proc = spawn('gh', ['repo', 'view', '--web'], {
        cwd: this.cwd,
        detached: true,
        stdio: 'ignore',
      });

      proc.unref();

      proc.on('error', (err) => {
        resolve({
          success: false,
          error: { type: 'unknown', message: err.message }
        });
      });

      setTimeout(() => {
        resolve({ success: true, data: undefined });
      }, 100);
    });
  }

  /**
   * Handle common errors
   */
  private handleError<T>(error: unknown): GitHubResult<T> {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not logged in') || message.includes('authentication')) {
      return {
        success: false,
        error: { type: 'not_authenticated', message: 'Not authenticated with GitHub' }
      };
    }

    if (message.includes('Could not resolve') || message.includes('not a git repository')) {
      return {
        success: false,
        error: { type: 'not_github_repo', message: 'Not a GitHub repository' }
      };
    }

    if (message.includes('network') || message.includes('timeout')) {
      return {
        success: false,
        error: { type: 'network', message: 'Network error' }
      };
    }

    return {
      success: false,
      error: { type: 'unknown', message }
    };
  }
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}
