#!/usr/bin/env node
const { existsSync, statSync, readdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const root = __dirname;
const distIndex = join(root, 'dist', 'index.html');

const importantFiles = [
  'index.html',
  'settings.html',
  'vite.config.js',
  'package.json'
];
const importantDirs = ['src'];

function newestMtime(dir) {
  let latest = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    const stats = statSync(full);
    if (entry.isDirectory()) {
      latest = Math.max(latest, newestMtime(full));
    } else {
      latest = Math.max(latest, stats.mtimeMs);
    }
  }
  return latest;
}

function shouldRebuild() {
  if (process.env.FORCE_VITE_BUILD === '1') {
    return true;
  }
  if (!existsSync(distIndex)) {
    return true;
  }
  const distTime = statSync(distIndex).mtimeMs;
  for (const file of importantFiles) {
    const full = join(root, file);
    if (existsSync(full) && statSync(full).mtimeMs > distTime) {
      return true;
    }
  }
  for (const dir of importantDirs) {
    const full = join(root, dir);
    if (existsSync(full) && newestMtime(full) > distTime) {
      return true;
    }
  }
  return false;
}

if (shouldRebuild()) {
  console.log('[ensure-dist] Building renderer with `npm run build:frontend`...');
  const result = spawnSync('npm', ['run', 'build:frontend'], {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) {
    console.error('[ensure-dist] Failed to build renderer.');
    process.exit(result.status ?? 1);
  }
} else {
  console.log('[ensure-dist] Using existing dist assets.');
}
