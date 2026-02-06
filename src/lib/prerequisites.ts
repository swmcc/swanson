import { execSync } from 'child_process';

export interface Prerequisite {
  name: string;
  command: string;
  installHint: string;
  required: boolean;
}

export interface PrerequisiteCheck {
  name: string;
  installed: boolean;
  version?: string;
  installHint?: string;
  required: boolean;
}

const PREREQUISITES: Prerequisite[] = [
  {
    name: 'git',
    command: 'git --version',
    installHint: 'Install from https://git-scm.com/',
    required: true,
  },
  {
    name: 'gh',
    command: 'gh --version',
    installHint: 'brew install gh',
    required: true,
  },
  {
    name: 'lazygit',
    command: 'lazygit --version',
    installHint: 'brew install lazygit',
    required: true,
  },
  {
    name: 'make',
    command: 'make --version',
    installHint: 'xcode-select --install',
    required: true,
  },
];

/**
 * Check if a command exists and get its version
 */
function checkCommand(command: string): { installed: boolean; version?: string } {
  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    // Extract version from first line
    const firstLine = output.split('\n')[0];
    const versionMatch = firstLine.match(/(\d+\.\d+\.?\d*)/);
    return {
      installed: true,
      version: versionMatch ? versionMatch[1] : firstLine.trim().slice(0, 30),
    };
  } catch {
    return { installed: false };
  }
}

/**
 * Check all prerequisites
 */
export function checkPrerequisites(): PrerequisiteCheck[] {
  return PREREQUISITES.map((prereq) => {
    const check = checkCommand(prereq.command);
    return {
      name: prereq.name,
      installed: check.installed,
      version: check.version,
      installHint: check.installed ? undefined : prereq.installHint,
      required: prereq.required,
    };
  });
}

/**
 * Check if all required prerequisites are met
 */
export function allPrerequisitesMet(): boolean {
  const checks = checkPrerequisites();
  return checks.filter(c => c.required).every(c => c.installed);
}

/**
 * Get missing required prerequisites
 */
export function getMissingPrerequisites(): PrerequisiteCheck[] {
  const checks = checkPrerequisites();
  return checks.filter(c => c.required && !c.installed);
}
