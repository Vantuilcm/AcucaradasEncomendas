const fs = require('fs');
const path = require('path');

function writeEnvFile(targetDir) {
  ensureDir(targetDir);
  const p = path.join(targetDir, '.env.sentry-build-plugin');
  const content = ['SENTRY_DISABLE_AUTO_UPLOAD=1', 'SENTRY_ALLOW_FAILURE=1', ''].join('\n');
  fs.writeFileSync(p, content, 'utf8');
  console.log('[ci] wrote', p);
}

function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function findEasLocalBuildDirs(baseDir, limit = 2000) {
  const results = new Set();
  const queue = [{ dir: baseDir, depth: 0 }];
  let scanned = 0;
  while (queue.length && scanned < limit) {
    const { dir, depth } = queue.shift();
    scanned += 1;
    if (!fs.existsSync(dir)) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (full.includes('eas-build-local-nodejs')) {
        results.add(full);
        const buildDir = path.join(full, 'build');
        if (fs.existsSync(buildDir)) results.add(buildDir);
      }
      if (depth < 4) {
        queue.push({ dir: full, depth: depth + 1 });
      }
    }
  }
  return Array.from(results);
}

(function main() {
  const root = process.cwd();

  const roots = new Set([
    root,
    process.env.EAS_BUILD_ROOT,
    process.env.EAS_BUILD_WORKING_DIR,
    process.env.EAS_BUILD_WORKINGDIR,
    process.env.EAS_BUILD_PROJECT_ROOT,
    process.env.EAS_BUILD_DIR,
    process.env.EAS_BUILD_LOCAL_DIR,
    process.env.EAS_BUILD_LOCAL_TEMP_DIR
  ].filter(Boolean));

  const tempBases = [
    process.env.TMPDIR,
    process.env.TMP,
    process.env.TEMP,
    '/tmp',
    '/var/folders',
    '/private/var/folders'
  ].filter(Boolean);

  tempBases.forEach((base) => {
    findEasLocalBuildDirs(base).forEach((dir) => roots.add(dir));
  });

  roots.forEach((r) => {
    if (fs.existsSync(r)) {
      writeEnvFile(r);
      const iosDir = path.join(r, 'ios');
      if (fs.existsSync(iosDir)) {
        writeEnvFile(iosDir);
      }
    }
  });

  const sentryCliPath = path.join(root, 'node_modules', '@sentry', 'cli', 'bin');
  if (fs.existsSync(sentryCliPath)) {
    const stub = ['#!/usr/bin/env bash', 'echo "[ci] sentry-cli stubbed (skipping upload)"', 'exit 0', ''].join('\n');
    ensureDir(sentryCliPath);
    const stubFile = path.join(sentryCliPath, 'sentry-cli');
    fs.writeFileSync(stubFile, stub, 'utf8');
    try {
      fs.chmodSync(stubFile, 0o755);
    } catch (e) {}
    console.log('[ci] stubbed', stubFile);
  }

  const binDir = path.join(root, 'node_modules', '.bin');
  if (fs.existsSync(binDir)) {
    const stub = ['#!/usr/bin/env bash', 'echo "[ci] sentry-cli stubbed (skipping upload)"', 'exit 0', ''].join('\n');
    const stubFile = path.join(binDir, 'sentry-cli');
    fs.writeFileSync(stubFile, stub, 'utf8');
    try {
      fs.chmodSync(stubFile, 0o755);
    } catch (e) {}
    console.log('[ci] stubbed', stubFile);
  }
})();
