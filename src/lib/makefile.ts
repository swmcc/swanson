import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface MakeTarget {
  name: string;
  description?: string;
  phony: boolean;
}

/**
 * Parse a Makefile and extract targets matching a pattern
 */
export async function parseMakefile(projectPath: string, pattern = /^local\./): Promise<MakeTarget[]> {
  const makefilePath = join(projectPath, 'Makefile');

  if (!existsSync(makefilePath)) {
    return [];
  }

  try {
    const content = await readFile(makefilePath, 'utf-8');
    const lines = content.split('\n');

    const targets: MakeTarget[] = [];
    const phonyTargets = new Set<string>();

    // First pass: find .PHONY declarations
    for (const line of lines) {
      const phonyMatch = line.match(/^\.PHONY:\s*(.+)/);
      if (phonyMatch) {
        phonyMatch[1].split(/\s+/).forEach(t => phonyTargets.add(t.trim()));
      }
    }

    // Second pass: find target definitions
    let lastComment = '';
    for (const line of lines) {
      // Track comments that might be descriptions
      if (line.startsWith('#')) {
        lastComment = line.replace(/^#\s*/, '').trim();
        continue;
      }

      // Match target definitions (name: dependencies)
      const targetMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*):/);
      if (targetMatch) {
        const name = targetMatch[1];

        // Only include targets matching the pattern
        if (pattern.test(name)) {
          targets.push({
            name,
            description: lastComment || undefined,
            phony: phonyTargets.has(name),
          });
        }
        lastComment = '';
      } else if (line.trim() && !line.startsWith('\t')) {
        lastComment = '';
      }
    }

    return targets;
  } catch (error) {
    return [];
  }
}

/**
 * Get a friendly display name from a make target
 * e.g., "local.dev" -> "dev", "local.install" -> "install"
 */
export function getTargetDisplayName(target: string): string {
  return target.replace(/^local\./, '');
}
