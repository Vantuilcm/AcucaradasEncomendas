const fs = require('fs');
const path = require('path');

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

function collectIosRoots() {
  const roots = new Set([
    process.cwd(),
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

  const iosRoots = new Set();
  roots.forEach((root) => {
    if (!fs.existsSync(root)) return;
    const iosDir = path.join(root, 'ios');
    if (fs.existsSync(iosDir)) iosRoots.add(iosDir);
  });
  return Array.from(iosRoots);
}

const pbxprojFiles = [];
const walk = (dir) => {
  const entries = fs.readdirSync(dir);
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (entry === 'project.pbxproj') {
      pbxprojFiles.push(fullPath);
    }
  });
};

const iosRoots = collectIosRoots();

if (iosRoots.length === 0) {
  console.log('[ci] ios directory not found under known roots');
  process.exit(0);
}

iosRoots.forEach((root) => walk(root));

if (pbxprojFiles.length === 0) {
  console.log('[ci] pbxproj not found under ios/');
  process.exit(0);
}

pbxprojFiles.forEach((pbxproj) => {
  let content = fs.readFileSync(pbxproj, 'utf8');

  content = content.replace(
    /(\/\* Upload Debug Symbols to Sentry \*\/[\s\S]*?shellScript = ")(.*?)(";[\s\S]*?\};)/g,
    (_m, a, _b, c) => `${a}echo \\\"[ci] skip sentry upload\\\"\\nexit 0${c}`
  );

  content = content.replace(
    /(\/\*[^\n]*Sentry[^\n]*\*\/[\s\S]*?shellScript = ")(.*?)(";[\s\S]*?\};)/g,
    (_m, a, _b, c) => `${a}echo \"[ci] skip sentry phase\"\\nexit 0${c}`
  );

  content = content.replace(
    /(shellScript = ")([\s\S]*?sentry-cli[\s\S]*?)(";)/g,
    (_m, a, _b, c) => `${a}echo \"[ci] skip sentry-cli\"\\nexit 0${c}`
  );

  content = content.replace(
    /\/node_modules\/@sentry\/cli\/bin\/sentry-cli react-native xcode /g,
    ''
  );

  fs.writeFileSync(pbxproj, content, 'utf8');
  console.log('[ci] nuked sentry build phases in pbxproj:', pbxproj);
});
