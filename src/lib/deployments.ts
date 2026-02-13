import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Types for deployment data
export interface Deployment {
  id: number;
  environment: string;
  ref: string;
  shortRef: string;
  createdAt: string;
  status: 'pending' | 'in_progress' | 'success' | 'failure' | 'inactive' | 'queued' | 'waiting';
  description?: string;
  creator?: string;
}

export interface DeploymentError {
  type: 'not_installed' | 'not_authenticated' | 'not_github_repo' | 'no_deployments' | 'network' | 'unknown';
  message: string;
}

export type DeploymentResult<T> =
  | { success: true; data: T }
  | { success: false; error: DeploymentError };

/**
 * GitHub Deployments API abstraction
 * Uses `gh api` to fetch deployment data
 */
export class Deployments {
  private cwd: string;

  constructor(projectPath: string) {
    this.cwd = projectPath;
  }

  /**
   * List deployments for the repository
   */
  async listDeployments(limit = 5): Promise<DeploymentResult<Deployment[]>> {
    try {
      // First get the repo info to build the API path
      const { stdout: repoJson } = await execAsync(
        'gh repo view --json owner,name',
        { cwd: this.cwd }
      );
      const repo = JSON.parse(repoJson);
      const owner = repo.owner.login;
      const name = repo.name;

      // Fetch deployments
      const { stdout: deploymentsJson } = await execAsync(
        `gh api repos/${owner}/${name}/deployments --jq '.[:${limit}]'`,
        { cwd: this.cwd }
      );

      const rawDeployments = JSON.parse(deploymentsJson || '[]');

      if (rawDeployments.length === 0) {
        return { success: true, data: [] };
      }

      // Fetch status for each deployment in parallel
      const deployments = await Promise.all(
        rawDeployments.map(async (d: any) => {
          const status = await this.getDeploymentStatus(owner, name, d.id);
          return {
            id: d.id,
            environment: d.environment,
            ref: d.ref,
            shortRef: d.ref.substring(0, 7),
            createdAt: d.created_at,
            status: status,
            description: d.description,
            creator: d.creator?.login,
          };
        })
      );

      return { success: true, data: deployments };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get the latest status for a deployment
   */
  private async getDeploymentStatus(
    owner: string,
    name: string,
    deploymentId: number
  ): Promise<Deployment['status']> {
    try {
      const { stdout } = await execAsync(
        `gh api repos/${owner}/${name}/deployments/${deploymentId}/statuses --jq '.[0].state // "pending"'`,
        { cwd: this.cwd }
      );
      const state = stdout.trim().toLowerCase();

      // Map GitHub states to our types
      const stateMap: Record<string, Deployment['status']> = {
        pending: 'pending',
        in_progress: 'in_progress',
        success: 'success',
        failure: 'failure',
        error: 'failure',
        inactive: 'inactive',
        queued: 'queued',
        waiting: 'waiting',
      };

      return stateMap[state] || 'pending';
    } catch {
      return 'pending';
    }
  }

  /**
   * Get deployment count
   */
  async getDeploymentCount(): Promise<DeploymentResult<number>> {
    try {
      const result = await this.listDeployments(100);
      return {
        success: true,
        data: result.success ? result.data.length : 0,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Open deployments page in browser
   */
  async openInBrowser(): Promise<DeploymentResult<void>> {
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

      // Open to deployments tab
      setTimeout(async () => {
        try {
          const { stdout } = await execAsync('gh repo view --json url', { cwd: this.cwd });
          const { url } = JSON.parse(stdout);
          spawn('open', [`${url}/deployments`], { detached: true, stdio: 'ignore' }).unref();
        } catch {
          // Fallback already opened repo
        }
        resolve({ success: true, data: undefined });
      }, 100);
    });
  }

  /**
   * Handle common errors
   */
  private handleError<T>(error: unknown): DeploymentResult<T> {
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
 * Get status indicator for deployment
 */
export function getStatusIndicator(status: Deployment['status']): { symbol: string; color: string } {
  switch (status) {
    case 'success':
      return { symbol: '✓', color: 'green' };
    case 'failure':
      return { symbol: '✗', color: 'red' };
    case 'in_progress':
      return { symbol: '●', color: 'yellow' };
    case 'pending':
    case 'queued':
    case 'waiting':
      return { symbol: '○', color: 'yellow' };
    case 'inactive':
      return { symbol: '○', color: 'gray' };
    default:
      return { symbol: '?', color: 'gray' };
  }
}
