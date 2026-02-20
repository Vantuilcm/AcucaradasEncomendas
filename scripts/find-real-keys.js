const fs = require('fs');
const path = require('path');

const patterns = [
  /pk_live_[a-zA-Z0-9]+/,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
  /https:\/\/api\.acucaradas\.com/
];

const skipDirs = ['node_modules', '.git', '.expo', 'ios', 'android', 'functions'];

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (skipDirs.includes(file)) continue;
      search(fullPath);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          const matches = content.match(pattern);
          console.log(`Found match "${matches[0]}" for pattern ${pattern} in: ${fullPath}`);
        }
      }
    }
  }
}

search('.');
