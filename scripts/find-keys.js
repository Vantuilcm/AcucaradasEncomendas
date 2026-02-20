const fs = require('fs');
const path = require('path');

function searchFiles(dir, pattern) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchFiles(fullPath, pattern);
            }
        } else {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes(pattern)) {
                    console.log(`Found "${pattern}" in: ${fullPath}`);
                }
            } catch (e) {
                // Ignore binary files or errors
            }
        }
    }
}

console.log('Searching for pk_live_...');
searchFiles('.', 'pk_live_');
console.log('Searching for sk_live_...');
searchFiles('.', 'sk_live_');
console.log('Search finished.');
