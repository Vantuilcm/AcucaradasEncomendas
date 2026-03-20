const fs = require('fs');
const path = 'test_fs_output.txt';
try {
  fs.writeFileSync(path, 'FS Test Successful\n');
  console.log('File written successfully');
} catch (e) {
  console.error('File write failed', e);
}
