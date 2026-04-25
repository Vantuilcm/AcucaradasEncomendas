const { execSync } = require('child_process');
try {
  const output = execSync('npx tsc --noEmit', { encoding: 'utf8' });
  console.log('TS Check Passed');
  console.log(output);
} catch (e) {
  console.log('TS Errors Found:');
  console.log(e.stdout);
}
