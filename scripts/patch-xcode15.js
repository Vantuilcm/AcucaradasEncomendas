const fs = require('fs');
const path = require('path');

console.log('🛠️ Aplicando patches para Xcode 15 em node_modules...');

const projectRoot = process.cwd();

// Helper para ler arquivo
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.warn(`❌ Arquivo não encontrado: ${filePath}`);
    return null;
  }
}

// Helper para escrever arquivo
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Arquivo atualizado: ${filePath}`);
  } catch (e) {
    console.error(`❌ Erro ao escrever em: ${filePath}`, e);
  }
}

const tasks = [
  {
    file: 'node_modules/react-native/ReactCommon/yoga/yoga/Yoga.h',
    patch: (content) => {
      // Verifica se precisa de patch (se usa YGNodeRef em YGMeasureFunc)
      const regex = /typedef\s+YGSize\s+\(\*YGMeasureFunc\)\(\s*YGNodeRef\s+node/;
      if (regex.test(content)) {
        console.log('🔧 Atualizando Yoga.h para usar YGNodeConstRef...');
        return content.replace(regex, 'typedef YGSize (*YGMeasureFunc)(YGNodeConstRef node');
      }
      return content;
    }
  },
  {
    file: 'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
    patch: (content) => {
      let newContent = content;
      
      // 1. Limpar declarações duplicadas ou antigas
      // Remove linhas que contêm as declarações estáticas com ; no final
      const declRegex = /static\s+(YGSize|float)\s+(RCTBaseTextInputShadowViewMeasure|RCTTextInputShadowViewBaseline)\s*\([^)]+\);\s*\n/g;
      if (declRegex.test(newContent)) {
         console.log('🧹 Limpando declarações antigas...');
         newContent = newContent.replace(declRegex, '');
      }

      // 2. Inserir forward declarations corretas
      const implRegex = /@implementation\s+RCTBaseTextInputShadowView\s*\{/;
      
      if (implRegex.test(newContent)) {
        // Verifica se já existe a declaração (com ponto e vírgula)
        const hasDecl = /static\s+YGSize\s+RCTBaseTextInputShadowViewMeasure\s*\([^)]+\);/.test(newContent);
        
        if (!hasDecl) {
             console.log('🔧 Inserindo forward declarations em RCTBaseTextInputShadowView.m...');
             const declarations = `static YGSize RCTBaseTextInputShadowViewMeasure(const struct YGNode *node, float width, YGMeasureMode widthMode, float height, YGMeasureMode heightMode);
static float RCTTextInputShadowViewBaseline(const struct YGNode *node, const float width, const float height);

@implementation RCTBaseTextInputShadowView {`;
             newContent = newContent.replace(implRegex, declarations);
        }
      }

      // 3. Atualizar as definições das funções (implementation)
      // Substitui 'YGNodeRef node' ou 'YGNodeConstRef node' por 'const struct YGNode *node'
      const measureFuncRegex = /static\s+YGSize\s+RCTBaseTextInputShadowViewMeasure\s*\(\s*(YGNodeRef|YGNodeConstRef)\s+node/g;
      if (measureFuncRegex.test(newContent)) {
         console.log('🔧 Corrigindo assinatura de RCTBaseTextInputShadowViewMeasure...');
         newContent = newContent.replace(measureFuncRegex, 'static YGSize RCTBaseTextInputShadowViewMeasure(const struct YGNode *node');
      }

      const baselineFuncRegex = /static\s+float\s+RCTTextInputShadowViewBaseline\s*\(\s*(YGNodeRef|YGNodeConstRef)\s+node/g;
      if (baselineFuncRegex.test(newContent)) {
         console.log('🔧 Corrigindo assinatura de RCTTextInputShadowViewBaseline...');
         newContent = newContent.replace(baselineFuncRegex, 'static float RCTTextInputShadowViewBaseline(const struct YGNode *node');
      }

      return newContent;
    }
  },
  {
    file: 'node_modules/react-native/React/Views/RCTShadowView.m',
    patch: (content) => {
      const regex = /RCTShadowViewMeasure\s*\(\s*YGNodeRef\s+node/g;
      if (regex.test(content)) {
        console.log('🔧 Corrigindo RCTShadowView.m...');
        return content.replace(regex, 'RCTShadowViewMeasure(const struct YGNode *node');
      }
      return content;
    }
  },
  {
    file: 'node_modules/react-native/Libraries/Text/Text/RCTTextShadowView.m',
    patch: (content) => {
      const regex = /RCTTextShadowViewMeasure\s*\(\s*YGNodeRef\s+node/g;
      if (regex.test(content)) {
        console.log('🔧 Corrigindo RCTTextShadowView.m...');
        return content.replace(regex, 'RCTTextShadowViewMeasure(const struct YGNode *node');
      }
      return content;
    }
  }
];

tasks.forEach(task => {
  const fullPath = path.join(projectRoot, task.file);
  const content = readFile(fullPath);
  if (content) {
    const newContent = task.patch(content);
    if (newContent !== content) {
      writeFile(fullPath, newContent);
    } else {
      console.log(`ℹ️ Sem alterações necessárias em: ${task.file}`);
    }
  }
});

console.log('✅ Patches concluídos.');
