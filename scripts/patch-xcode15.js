const fs = require('fs');
const path = require('path');

console.log('🛠️ Aplicando patches para Xcode 15 em node_modules...');

const projectRoot = process.cwd();

const patches = [
  {
    file: 'node_modules/react-native/ReactCommon/yoga/yoga/Yoga.h',
    find: /YGNodeRef\s+node,\s+float\s+width,\s+YGMeasureMode\s+widthMode/g,
    replace: 'YGNodeConstRef node, float width, YGMeasureMode widthMode'
  },
  {
    file: 'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
    find: /@implementation\s+RCTBaseTextInputShadowView\s+\{/g,
    replace: `static YGSize RCTBaseTextInputShadowViewMeasure(YGNodeConstRef node, float width, YGMeasureMode widthMode, float height, YGMeasureMode heightMode);
static float RCTTextInputShadowViewBaseline(YGNodeConstRef node, const float width, const float height);

@implementation RCTBaseTextInputShadowView {`
  },
  {
    file: 'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
    find: /static\s+YGSize\s+RCTBaseTextInputShadowViewMeasure\s*\(\s*YGNodeRef\s+node/g,
    replace: 'static YGSize RCTBaseTextInputShadowViewMeasure(YGNodeConstRef node'
  },
  {
    file: 'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
    find: /static\s+float\s+RCTTextInputShadowViewBaseline\s*\(\s*YGNodeRef\s+node/g,
    replace: 'static float RCTTextInputShadowViewBaseline(YGNodeConstRef node'
  },
  {
    file: 'node_modules/react-native/React/Views/RCTShadowView.m',
    find: /RCTShadowViewMeasure\s*\(\s*YGNodeRef\s+node/g,
    replace: 'RCTShadowViewMeasure(YGNodeConstRef node'
  },
  {
    file: 'node_modules/react-native/Libraries/Text/Text/RCTTextShadowView.m',
    find: /RCTTextShadowViewMeasure\s*\(\s*YGNodeRef\s+node/g,
    replace: 'RCTTextShadowViewMeasure(YGNodeConstRef node'
  }
];

patches.forEach(patch => {
  const fullPath = path.join(projectRoot, patch.file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.match(patch.find)) {
      console.log(`✅ Aplicando patch em: ${patch.file}`);
      content = content.replace(patch.find, patch.replace);
      fs.writeFileSync(fullPath, content);
    } else if (content.includes('YGNodeConstRef')) {
      console.log(`ℹ️ Patch já aplicado em: ${patch.file}`);
    } else {
      console.warn(`⚠️ Regex não casou em: ${patch.file}`);
      // Fallback para Measure
      if (patch.file.endsWith('.m')) {
        const fallback = /Measure\(\s*YGNodeRef\s+node/g;
        if (content.match(fallback)) {
          console.log(`✅ Aplicando fallback em: ${patch.file}`);
          content = content.replace(fallback, 'Measure(YGNodeConstRef node');
          fs.writeFileSync(fullPath, content);
        }
      }
    }
  } else {
    console.warn(`❌ Arquivo não encontrado: ${patch.file}`);
  }
});

console.log('✅ Patches concluídos.');
