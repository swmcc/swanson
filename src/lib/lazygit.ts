import { spawn, execSync } from 'child_process';

export interface LazyGitResult {
  success: boolean;
  error?: string;
}

/**
 * Check if lazygit is installed
 */
export function isLazyGitInstalled(): boolean {
  try {
    execSync('which lazygit', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Launch lazygit in the given directory
 * Returns a promise that resolves when lazygit exits
 */
export function launchLazyGit(cwd: string): Promise<LazyGitResult> {
  return new Promise((resolve) => {
    if (!isLazyGitInstalled()) {
      resolve({
        success: false,
        error: 'lazygit is not installed. Install with: brew install lazygit',
      });
      return;
    }

    const lazygit = spawn('lazygit', [], {
      cwd,
      stdio: 'inherit', // Take over the terminal
      detached: false,
    });

    lazygit.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
      });
    });

    lazygit.on('close', (code) => {
      resolve({
        success: code === 0,
        error: code !== 0 ? `lazygit exited with code ${code}` : undefined,
      });
    });
  });
}

/**
 * Get lazygit version
 */
export function getLazyGitVersion(): string | null {
  try {
    const output = execSync('lazygit --version', { encoding: 'utf-8' });
    const match = output.match(/version=([^\s,]+)/);
    return match ? match[1] : output.trim();
  } catch {
    return null;
  }
}
