const { execSync } = require('child_process');
const fs = require('fs');

const logFile = 'compra_test_result.txt';

try {
  console.log('Running CompraCompleta.test.tsx...');
  const out = execSync('npx jest src/__tests__/e2e/CompraCompleta.test.tsx --detectOpenHandles --forceExit', { encoding: 'utf8', stdio: 'pipe' });
  fs.writeFileSync(logFile, 'SUCCESS\n' + out);
  console.log('Test PASSED');
} catch (e) {
  const errorMsg = 'FAILED\n' + (e.stdout || '') + '\n' + (e.stderr || '');
  fs.writeFileSync(logFile, errorMsg);
  console.error('Test FAILED');
}
