// Removes installed dependencies, build output and tool caches from the root and every
// workspace. Plain Node with no imports outside the standard library, because it
// deletes node_modules (and turbo with it) while it runs.
//
//   pnpm clean        # everything, then run `pnpm install` again
//   pnpm clean:build  # build output and caches only, keeps node_modules
//
// The root `clean` script replaces pnpm 11's built-in `pnpm clean`, which only
// removes node_modules.

import { readdir, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const keepDeps = process.argv.includes('--keep-deps');

// Matches the `packages` globs in pnpm-workspace.yaml.
const workspaceParents = ['apps', 'packages'];

const buildAndCaches = [
  'dist',
  '.next',
  '.turbo',
  'coverage',
  'tsconfig.tsbuildinfo',
  'node_modules/.cache',
];

async function workspaces() {
  const dirs = [root];
  for (const parent of workspaceParents) {
    const entries = await readdir(join(root, parent), { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isDirectory()) dirs.push(join(root, parent, entry.name));
    }
  }
  return dirs;
}

const targets = keepDeps ? buildAndCaches : [...buildAndCaches, 'node_modules'];
let removed = 0;

for (const dir of await workspaces()) {
  for (const target of targets) {
    const path = join(dir, target);
    try {
      await rm(path, { recursive: true });
      process.stdout.write(`removed ${relative(root, path)}\n`);
      removed += 1;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}

process.stdout.write(removed === 0 ? 'Nothing to clean.\n' : `Cleaned ${removed} paths.\n`);
