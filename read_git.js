const { execSync } = require('child_process');
const fs = require('fs');

try {
  const content = execSync('git --no-pager show origin/main:src/screens/LoginScreen.tsx', { encoding: 'utf8' });
  fs.writeFileSync('original.tsx', content);
} catch (e) {
  try {
    const content2 = execSync('git --no-pager show master:src/screens/LoginScreen.tsx', { encoding: 'utf8' });
    fs.writeFileSync('original.tsx', content2);
  } catch (e2) {
    fs.writeFileSync('original_error.txt', e2.toString());
  }
}
