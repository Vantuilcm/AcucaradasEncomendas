const fs = require('fs');
const path = require('path');

console.log('--- Applying React Native 0.72 Xcode 16 Fixes ---');

function replaceInFile(filePath, searchRegex, replaceString) {
  try {
    const fullPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`[WARN] File not found: ${fullPath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const newContent = content.replace(searchRegex, replaceString);
    
    if (content !== newContent) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log(`[OK] Patched: ${filePath}`);
    } else {
      console.log(`[SKIP] Already patched or pattern not found: ${filePath}`);
    }
  } catch (err) {
    console.error(`[ERROR] Failed to patch ${filePath}:`, err.message);
  }
}

// 1. Fix RCTBaseTextInputShadowView.m
replaceInFile(
  'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
  /YGNodeSetMeasureFunc\(\s*self\.yogaNode\s*,\s*RCTBaseTextInputShadowViewMeasure\s*\);/g,
  'YGNodeSetMeasureFunc(self.yogaNode, (YGMeasureFunc)RCTBaseTextInputShadowViewMeasure);'
);

replaceInFile(
  'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
  /YGNodeSetBaselineFunc\(\s*self\.yogaNode\s*,\s*RCTTextInputShadowViewBaseline\s*\);/g,
  'YGNodeSetBaselineFunc(self.yogaNode, (YGBaselineFunc)RCTTextInputShadowViewBaseline);'
);

// 2. Fix RCTTextShadowView.m
replaceInFile(
  'node_modules/react-native/Libraries/Text/Text/RCTTextShadowView.m',
  /YGNodeSetMeasureFunc\(\s*self\.yogaNode\s*,\s*RCTTextShadowViewMeasure\s*\);/g,
  'YGNodeSetMeasureFunc(self.yogaNode, (YGMeasureFunc)RCTTextShadowViewMeasure);'
);

replaceInFile(
  'node_modules/react-native/Libraries/Text/Text/RCTTextShadowView.m',
  /YGNodeSetBaselineFunc\(\s*self\.yogaNode\s*,\s*RCTTextShadowViewBaseline\s*\);/g,
  'YGNodeSetBaselineFunc(self.yogaNode, (YGBaselineFunc)RCTTextShadowViewBaseline);'
);

console.log('--- Fixes completed ---');