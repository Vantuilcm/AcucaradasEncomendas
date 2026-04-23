const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'node_modules/react-native/src/private/animated/NativeAnimatedHelper.js');

if (fs.existsSync(filePath)) {
  console.log(`🩹 [PATCH] Patching ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // The problematic line usually looks like:
  // }) as $NonMaybeType<NativeAnimatedModule>;
  // We want to change 'as' to ':' for Flow compatibility if that's the issue.
  
  const lines = content.split('\n');
  let patched = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('}) as $NonMaybeType')) {
      console.log(`[PATCH] Found problematic line at ${i + 1}: ${lines[i].trim()}`);
      // Replace '}) as $NonMaybeType<...>' with '}),'
      lines[i] = lines[i].replace(/}\) as \$NonMaybeType<[^>]+>(\['[^'\]]+'\])?/, '})');
      patched = true;
    }
  }
  
  if (patched) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('✅ [PATCH] Successfully patched NativeAnimatedHelper.js');
  } else {
    console.log('⚠️ [PATCH] Pattern not found in NativeAnimatedHelper.js. It might already be correct or the version is different.');
    // Let's print a few lines around 138 to debug
    const lines = content.split('\n');
    console.log('Line 138 context:');
    for (let i = Math.max(0, 130); i < Math.min(lines.length, 145); i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  }
} else {
  console.log(`❌ [PATCH] File not found: ${filePath}`);
}
