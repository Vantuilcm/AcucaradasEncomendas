const fs = require('fs');
const path = require('path');

function searchFiles(dir, patterns) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'ios' && file !== 'android') {
                searchFiles(fullPath, patterns);
            }
        } else {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                for (const pattern of patterns) {
                    if (content.includes(pattern)) {
                        console.log(`Found pattern "${pattern}" in: ${fullPath}`);
                        // If it looks like a real key (not just the pattern name), log the line
                        const lines = content.split('\n');
                        lines.forEach((line, index) => {
                            if (line.includes(pattern)) {
                                console.log(`  Line ${index + 1}: ${line.trim()}`);
                            }
                        });
                    }
                }
            } catch (e) {
                // Ignore binary files or errors
            }
        }
    }
}

const patternsToSearch = [
    'api.acucaradasencomendas.com.br',
    'onesignal',
    'pk_live_',
    'sk_live_',
    'AIza'
];

console.log('Searching for production patterns...');
searchFiles('.', patternsToSearch);
console.log('Search finished.');
