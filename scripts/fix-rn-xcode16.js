const fs = require('fs');
const path = require('path');

const filesToPatch = [
  {
    file: 'node_modules/react-native/ReactCommon/yoga/yoga/Yoga.h',
    replacements: [
      { search: /YGMeasureFunc\)\(YGNodeRef/g, replace: 'YGMeasureFunc)(YGNodeConstRef' }
    ]
  },
  {
    file: 'node_modules/react-native/Libraries/Text/Text/RCTTextShadowView.m',
    replacements: [
      { search: /YGNodeSetMeasureFunc\(self\.yogaNode, RCTTextShadowViewMeasure\);/g, replace: 'YGNodeSetMeasureFunc(self.yogaNode, (YGMeasureFunc)RCTTextShadowViewMeasure);' },
      { search: /YGNodeSetBaselineFunc\(self\.yogaNode, RCTTextShadowViewBaseline\);/g, replace: 'YGNodeSetBaselineFunc(self.yogaNode, (YGBaselineFunc)RCTTextShadowViewBaseline);' },
      { search: /RCTTextShadowViewMeasure\(YGNodeRef/g, replace: 'RCTTextShadowViewMeasure(YGNodeConstRef' }
    ]
  },
  {
    file: 'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
    replacements: [
      { search: /YGNodeSetMeasureFunc\(self\.yogaNode, RCTBaseTextInputShadowViewMeasure\);/g, replace: 'YGNodeSetMeasureFunc(self.yogaNode, (YGMeasureFunc)RCTBaseTextInputShadowViewMeasure);' },
      { search: /YGNodeSetBaselineFunc\(self\.yogaNode, RCTTextInputShadowViewBaseline\);/g, replace: 'YGNodeSetBaselineFunc(self.yogaNode, (YGBaselineFunc)RCTTextInputShadowViewBaseline);' },
      { search: /RCTBaseTextInputShadowViewMeasure\(\s*YGNodeRef/g, replace: 'RCTBaseTextInputShadowViewMeasure(const struct YGNode *' },
      { search: /RCTTextInputShadowViewBaseline\(YGNodeRef/g, replace: 'RCTTextInputShadowViewBaseline(const struct YGNode *' }
    ]
  },
  {
    file: 'node_modules/expo-apple-authentication/ios/AppleAuthenticationExceptions.swift',
    replacements: [
      { search: /return RequestFailedException\(\)\s*\n\s*\}/g, replace: 'return RequestFailedException()\n  @unknown default:\n    return RequestUnknownException()\n  }' }
    ]
  }
];

console.log('Aplicando correções manuais para Xcode 16...');

for (const { file, replacements } of filesToPatch) {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    for (const { search, replace } of replacements) {
      if (content.match(search)) {
        content = content.replace(search, replace);
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Patched: ${file}`);
    } else {
      console.log(`⚠️ No changes needed for: ${file}`);
    }
  } else {
    console.log(`❌ File not found: ${file}`);
  }
}
console.log('Concluído.');