const fs = require('fs');
const path = require('path');

const patterns = [
  /pk_live_[a-zA-Z0-9]{24,}/g, // Stripe live key
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, // UUID (OneSignal)
  /https?:\/\/[a-zA-Z0-9.-]+\.[a-z]{2,}(?::\d+)?/g, // URLs
  /AIza[0-9A-Za-z-_]{35}/g // Firebase API Key
];

const skipDirs = ['node_modules', '.git', '.expo'];

function searchFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 1024 * 1024) return; // Skip files > 1MB

    const content = fs.readFileSync(filePath, 'utf8');
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Filter out common false positives
          if (match.includes('localhost') || match.includes('127.0.0.1') || match.includes('expo.dev')) return;
          console.log(`Found match in ${filePath}: ${match}`);
        });
      }
    });
  } catch (err) {
    // Ignore errors
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!skipDirs.includes(file)) {
          walkDir(fullPath);
        }
      } else {
        searchFile(fullPath);
      }
    });
  } catch (err) {
    // Ignore errors
  }
}

const targetDir = process.argv[2] || '.';
console.log(`Searching for secrets in ${targetDir}...`);
walkDir(targetDir);
console.log('Search finished.');
