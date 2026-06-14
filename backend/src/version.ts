import fs from 'fs';
import path from 'path';

// Build/version info, generated from git by scripts/gen-version.mjs at build
// and dev start (see backend package.json "predev"/"prebuild"). The file lives
// at backend/version.json — one level up from both src/ (dev) and dist/ (prod).
export interface VersionInfo {
  version: string;
  build: number;
  commit: string;
  commitDate: string;
  branch: string;
  dirty: boolean;
  display: string;
  generatedAt: string;
}

const fallback: VersionInfo = {
  version: '0.0.0',
  build: 0,
  commit: 'unknown',
  commitDate: '',
  branch: '',
  dirty: false,
  display: 'v0.0.0+0.unknown',
  generatedAt: '',
};

function load(): VersionInfo {
  try {
    const file = path.join(__dirname, '..', 'version.json');
    const raw = fs.readFileSync(file, 'utf8');
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export const versionInfo: VersionInfo = load();
