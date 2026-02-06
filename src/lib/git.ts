import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitStatus {
  branch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
}

export async function getGitStatus(cwd: string): Promise<GitStatus | null> {
  try {
    // Check if it's a git repo
    await execAsync('git rev-parse --git-dir', { cwd });

    // Get branch name
    const { stdout: branchOut } = await execAsync(
      'git branch --show-current',
      { cwd }
    );
    const branch = branchOut.trim() || 'HEAD';

    // Get status
    const { stdout: statusOut } = await execAsync(
      'git status --porcelain',
      { cwd }
    );

    const lines = statusOut.trim().split('\n').filter(Boolean);
    let staged = 0;
    let unstaged = 0;
    let untracked = 0;

    for (const line of lines) {
      const index = line[0];
      const worktree = line[1];

      if (index === '?') {
        untracked++;
      } else {
        if (index !== ' ' && index !== '?') staged++;
        if (worktree !== ' ' && worktree !== '?') unstaged++;
      }
    }

    // Get ahead/behind
    let ahead = 0;
    let behind = 0;
    try {
      const { stdout: aheadBehind } = await execAsync(
        'git rev-list --left-right --count HEAD...@{upstream}',
        { cwd }
      );
      const [a, b] = aheadBehind.trim().split(/\s+/).map(Number);
      ahead = a || 0;
      behind = b || 0;
    } catch {
      // No upstream set
    }

    return {
      branch,
      isClean: lines.length === 0,
      ahead,
      behind,
      staged,
      unstaged,
      untracked,
    };
  } catch {
    return null;
  }
}

export async function gitPull(cwd: string): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout } = await execAsync('git pull', { cwd });
    return { success: true, message: stdout.trim() };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Pull failed'
    };
  }
}

export async function gitFetch(cwd: string): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync('git fetch', { cwd });
    return { success: true, message: 'Fetched' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fetch failed'
    };
  }
}
