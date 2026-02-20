const fs = require('fs');
const path = require('path');

function searchFiles(dir, patterns) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchFiles(fullPath, patterns);
            }
        } else {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                for (const pattern of patterns) {
                    if (content.includes(pattern)) {
                        console.log(`Found "${pattern}" in: ${fullPath}`);
                    }
                }
            } catch (e) {
                // Ignore binary files or errors
            }
        }
    }
}

const patterns = [
    'STRIPE_PUBLISHABLE_KEY',
    'ONESIGNAL_APP_ID',
    'API_URL'
];

console.log(`Searching for ${patterns.join(', ')}...`);
searchFiles('.', patterns);
console.log('Search finished.');
