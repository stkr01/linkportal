#!/usr/bin/env node
// Generates build/version info from git so the server and a local checkout
// report the SAME version when they are on the same commit.
//
// Output JSON fields:
//   version     base version from backend/package.json (e.g. 1.0.0)
//   build       git commit count (monotonic integer, identical across clones)
//   commit      short commit hash (guarantees uniqueness)
//   commitDate  ISO date of the commit
//   branch      current branch name
//   dirty       true when the local working tree has uncommitted changes
//   display     human string, e.g. v1.0.0+347.a1b2c3d (or -dirty)
//   generatedAt build timestamp
//
// Usage:
//   node ../scripts/gen-version.mjs --out version.json   (writes file)
//   node ../scripts/gen-version.mjs                       (prints JSON to stdout)
//
// This script never throws: if git is unavailable it falls back to the
// package version so a build is never blocked by version generation.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

function git(args, fallback = '') {
  try {
    return execSync(`git ${args}`, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

function packageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'backend', 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const version = packageVersion();
const build = parseInt(git('rev-list --count HEAD', '0'), 10) || 0;
const commit = git('rev-parse --short HEAD', 'unknown');
const commitDate = git('log -1 --format=%cI') || new Date().toISOString();
const branch = git('rev-parse --abbrev-ref HEAD');
const dirty = git('status --porcelain') !== '';
const display = `v${version}+${build}.${commit}${dirty ? '-dirty' : ''}`;

const info = {
  version,
  build,
  commit,
  commitDate,
  branch,
  dirty,
  display,
  generatedAt: new Date().toISOString(),
};

const outIndex = process.argv.indexOf('--out');
if (outIndex !== -1 && process.argv[outIndex + 1]) {
  const outPath = resolve(process.cwd(), process.argv[outIndex + 1]);
  writeFileSync(outPath, JSON.stringify(info, null, 2) + '\n');
  // Log to stderr so stdout stays clean if anyone pipes the JSON.
  console.error(`[gen-version] ${display} -> ${outPath}`);
} else {
  process.stdout.write(JSON.stringify(info, null, 2) + '\n');
}
