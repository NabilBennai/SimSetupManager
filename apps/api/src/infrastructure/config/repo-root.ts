import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Le monorepo tourne parfois avec cwd = apps/api (pnpm --filter) et parfois
 * avec cwd = racine du repo (turbo). Les chemins relatifs (.env, sqlite file:)
 * doivent donc être ancrés sur la racine réelle du repo plutôt que sur cwd.
 */
export function findRepoRoot(fromDir: string): string {
  let dir = fromDir;
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('pnpm-workspace.yaml introuvable en remontant depuis ' + fromDir);
    }
    dir = parent;
  }
  return dir;
}
