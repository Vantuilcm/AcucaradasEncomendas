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
    find: /YGSize\s+RCTBaseTextInputShadowViewMeasure\s*\(\s*YGNodeRef\s+node/g,
    replace: 'YGSize RCTBaseTextInputShadowViewMeasure(YGNodeConstRef node'
  },
  {
    file: 'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
    find: /float\s+RCTTextInputShadowViewBaseline\s*\(\s*YGNodeRef\s+node/g,
    replace: 'float RCTTextInputShadowViewBaseline(YGNodeConstRef node'
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
    
    // Verifica se o patch específico já parece estar aplicado
    const isAlreadyApplied = typeof patch.replace === 'string' 
      ? content.includes(patch.replace) 
      : false; // Se for complexo, assume que precisa tentar

    if (content.match(patch.find)) {
      console.log(`✅ Aplicando patch em: ${patch.file}`);
      content = content.replace(patch.find, patch.replace);
      fs.writeFileSync(fullPath, content);
    } else if (isAlreadyApplied) {
      console.log(`ℹ️ Patch já verificado em: ${patch.file}`);
    } else {
      // Tenta regex menos estrita se falhar
      if (patch.file.endsWith('.m') && patch.replace.includes('YGNodeConstRef')) {
          console.warn(`⚠️ Regex estrita falhou em ${patch.file}, tentando fallback genérico...`);
          const genericFind = /YGNodeRef\s+node/g;
          if (content.match(genericFind)) {
             // Só aplica se estivermos num contexto de função Measure/Baseline
             // Mas como é difícil saber o contexto com regex simples, vamos confiar que esses arquivos precisam disso.
             // Melhor: Tentar regex sem 'static' ou espaços extras
             
             // Fallback específico para RCTBaseTextInputShadowViewMeasure
             if (patch.file.includes('RCTBaseTextInputShadowView.m')) {
                 const fallbackMeasure = /RCTBaseTextInputShadowViewMeasure\s*\([^)]*YGNodeRef\s+node/g;
                 if (content.match(fallbackMeasure)) {
                     console.log(`✅ Aplicando fallback (Measure) em: ${patch.file}`);
                     content = content.replace(/RCTBaseTextInputShadowViewMeasure\s*\(([^)]*)YGNodeRef\s+node/g, 'RCTBaseTextInputShadowViewMeasure($1YGNodeConstRef node');
                     fs.writeFileSync(fullPath, content);
                     return;
                 }
             }
          }
      }
      console.warn(`⚠️ Patch ignorado (não casou nem parece aplicado): ${patch.file}`);
    }
  } else {
    console.warn(`❌ Arquivo não encontrado: ${patch.file}`);
  }
});

console.log('✅ Patches concluídos.');
