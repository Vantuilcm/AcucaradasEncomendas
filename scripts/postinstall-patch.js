const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'node_modules/react-native/src/private/animated/NativeAnimatedHelper.js');

if (fs.existsSync(filePath)) {
  console.log(`🩹 [POSTINSTALL-PATCH] Patching ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const lines = content.split('\n');
  let patched = false;
  
  for (let i = 0; i < lines.length; i++) {
    // Check for both the line itself and the potential for it to be already patched or different
    if (lines[i].includes('}) as $NonMaybeType')) {
      console.log(`[POSTINSTALL-PATCH] Found problematic line at ${i + 1}: ${lines[i].trim()}`);
      // Replace '}) as $NonMaybeType<...>' with '}),' but preserve trailing commas or brackets
      lines[i] = lines[i].replace(/}\) as \$NonMaybeType<[^>]+>(\['[^'\]]+'\])?/, '})');
      patched = true;
    }
  }
  
  if (patched) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('✅ [POSTINSTALL-PATCH] Successfully patched NativeAnimatedHelper.js');
  } else {
    console.log('⚠️ [POSTINSTALL-PATCH] No problematic patterns found in NativeAnimatedHelper.js');
  }
} else {
  console.log(`⚠️ [POSTINSTALL-PATCH] File not found: ${filePath}. Skipping patch.`);
}
