const fs = require('fs');
const path = require('path');

// Função auxiliar para importação robusta de plugins
function importPlugin(moduleName, property) {
  try {
    const module = require(moduleName);
    if (module && typeof module[property] === 'function') {
      return module[property];
    }
    // Tenta exportação default se existir
    if (module && module.default && typeof module.default[property] === 'function') {
      return module.default[property];
    }
  } catch (e) {
    // Ignorar erro de importação
  }
  return null;
}

// Tentar importar de várias fontes possíveis
let withPodfile = importPlugin('@expo/config-plugins', 'withPodfile') ||
                  importPlugin('@expo/config-plugins/build/plugins/ios-plugins', 'withPodfile');

let withDangerousMod = importPlugin('@expo/config-plugins', 'withDangerousMod') ||
                       importPlugin('@expo/config-plugins/build/plugins/withDangerousMod', 'withDangerousMod');

// Fallback crítico para evitar crash no require, mas logar erro
if (!withPodfile) {
  console.error('[withSentryCppExceptions] ERRO CRÍTICO: withPodfile não encontrado! O fix do Sentry não será aplicado.');
  withPodfile = (config) => config;
}

if (!withDangerousMod) {
  console.error('[withSentryCppExceptions] ERRO CRÍTICO: withDangerousMod não encontrado!');
  withDangerousMod = (config) => config;
}

const PODFILE_SNIPPET = `
    # Sentry Removed - Cleaning up flags
    installer.pods_project.targets.each do |target|
      # Clean up any leftover flags if needed
    end
    
    # Patch Yoga incompatible function pointer types in React Native (Xcode 16)
    Dir.glob('Pods/React-RCTText/**/*.{m,mm}').each do |file|
      if File.exist?(file)
        content = File.read(file)
        changed = false
        
        # Patch 1: Add explicit casts to YGNodeSetMeasureFunc/BaselineFunc
        if content.include?('YGNodeSetMeasureFunc(self.yogaNode, RCTBaseTextInputShadowViewMeasure)')
          content = content.gsub('YGNodeSetMeasureFunc(self.yogaNode, RCTBaseTextInputShadowViewMeasure)', 'YGNodeSetMeasureFunc(self.yogaNode, (YGMeasureFunc)RCTBaseTextInputShadowViewMeasure)')
          changed = true
        end
        if content.include?('YGNodeSetBaselineFunc(self.yogaNode, RCTTextInputShadowViewBaseline)')
          content = content.gsub('YGNodeSetBaselineFunc(self.yogaNode, RCTTextInputShadowViewBaseline)', 'YGNodeSetBaselineFunc(self.yogaNode, (YGBaselineFunc)RCTTextInputShadowViewBaseline)')
          changed = true
        end
        if content.include?('YGNodeSetMeasureFunc(self.yogaNode, RCTTextShadowViewMeasure)')
          content = content.gsub('YGNodeSetMeasureFunc(self.yogaNode, RCTTextShadowViewMeasure)', 'YGNodeSetMeasureFunc(self.yogaNode, (YGMeasureFunc)RCTTextShadowViewMeasure)')
          changed = true
        end
        if content.include?('YGNodeSetBaselineFunc(self.yogaNode, RCTTextShadowViewBaseline)')
          content = content.gsub('YGNodeSetBaselineFunc(self.yogaNode, RCTTextShadowViewBaseline)', 'YGNodeSetBaselineFunc(self.yogaNode, (YGBaselineFunc)RCTTextShadowViewBaseline)')
          changed = true
        end

        # Patch 2: Update function signatures to use const struct YGNode *
        if content.include?('static YGSize RCTBaseTextInputShadowViewMeasure(YGNodeRef node,')
          content = content.gsub('static YGSize RCTBaseTextInputShadowViewMeasure(YGNodeRef node,', 'static YGSize RCTBaseTextInputShadowViewMeasure(const struct YGNode *node,')
          changed = true
        end
        if content.include?('static float RCTTextInputShadowViewBaseline(YGNodeRef node,')
          content = content.gsub('static float RCTTextInputShadowViewBaseline(YGNodeRef node,', 'static float RCTTextInputShadowViewBaseline(const struct YGNode *node,')
          changed = true
        end
        if content.include?('static YGSize RCTTextShadowViewMeasure(YGNodeRef node,')
          content = content.gsub('static YGSize RCTTextShadowViewMeasure(YGNodeRef node,', 'static YGSize RCTTextShadowViewMeasure(const struct YGNode *node,')
          changed = true
        end
        
        if changed
          puts "Patching Yoga function pointers in #{file}"
          File.write(file, content)
        end
      end
    end
`;

function addPostInstallBlock(contents) {
  if (contents.includes('Sentry Removed - Cleaning up flags')) {
    return contents;
  }
  if (contents.match(/post_install do \|installer\|/)) {
    return contents.replace(
      /post_install do \|installer\|/,
      `post_install do |installer|\n${PODFILE_SNIPPET}`
    );
  }
  return `${contents}\n\npost_install do |installer|\n${PODFILE_SNIPPET}\nend\n`;
}

function applyStringPatch(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[withSentryCppExceptions] File not found: ${filePath}`);
    return;
  }
  const contents = fs.readFileSync(filePath, 'utf8');
  let updated = contents;
  let changed = false;
  
  replacements.forEach(({ regex, replaceWith }) => {
    if (regex.test(updated)) {
      updated = updated.replace(regex, replaceWith);
      changed = true;
      console.log(`[withSentryCppExceptions] Applied patch to ${path.basename(filePath)} with regex ${regex}`);
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, updated);
    console.log(`[withSentryCppExceptions] Successfully saved patches to ${path.basename(filePath)}`);
  } else {
    console.log(`[withSentryCppExceptions] No changes needed for ${path.basename(filePath)}`);
  }
}

const withSentryCppExceptions = (config) => {
  // 1. Modificar Podfile
  config = withPodfile(config, (configMod) => {
    configMod.modResults.contents = addPostInstallBlock(configMod.modResults.contents);
    return configMod;
  });

  // 2. Modificar arquivos nativos (Yoga/React Native)
  config = withDangerousMod(config, [
    'ios',
    async (configMod) => {
      const projectRoot = configMod.modRequest.projectRoot;
      
      const filesToPatch = [
        // Yoga.h: typedef YGSize (*YGMeasureFunc)(YGNodeRef node, ...
        {
          path: path.join(projectRoot, 'node_modules', 'react-native', 'ReactCommon', 'yoga', 'yoga', 'Yoga.h'),
          replacements: [{
            regex: /typedef\s+YGSize\s+\(\*YGMeasureFunc\)\s*\(\s*YGNodeRef\s+node,/g,
            replaceWith: 'typedef YGSize (*YGMeasureFunc)(\n    YGNodeConstRef node,'
          }]
        },
        // RCTTextShadowView.m: RCTTextShadowViewMeasure(YGNodeRef node, ...
        {
          path: path.join(projectRoot, 'node_modules', 'react-native', 'Libraries', 'Text', 'Text', 'RCTTextShadowView.m'),
          replacements: [{
            regex: /RCTTextShadowViewMeasure\s*\(\s*YGNodeRef\s+node,/g,
            replaceWith: 'RCTTextShadowViewMeasure(YGNodeConstRef node,'
          }]
        },
        // RCTShadowView.m: RCTShadowViewMeasure(YGNodeRef node, ...
        {
          path: path.join(projectRoot, 'node_modules', 'react-native', 'React', 'Views', 'RCTShadowView.m'),
          replacements: [{
            regex: /RCTShadowViewMeasure\s*\(\s*YGNodeRef\s+node,/g,
            replaceWith: 'RCTShadowViewMeasure(YGNodeConstRef node,'
          }]
        },
        // RCTBaseTextInputShadowView.m: RCTBaseTextInputShadowViewMeasure(YGNodeRef node, ...
        // Also cover 'const struct YGNode *' just in case we need to normalize to YGNodeConstRef
        {
          path: path.join(projectRoot, 'node_modules', 'react-native', 'Libraries', 'Text', 'TextInput', 'RCTBaseTextInputShadowView.m'),
          replacements: [
            {
              regex: /RCTBaseTextInputShadowViewMeasure\s*\(\s*YGNodeRef\s+node,/g,
              replaceWith: 'RCTBaseTextInputShadowViewMeasure(YGNodeConstRef node,'
            },
            {
               // If it uses struct YGNode *, we might want to ensure it matches what Yoga expects if mismatch occurs
               // But usually const struct YGNode * IS YGNodeConstRef. 
               // Let's explicitly look for non-const struct YGNode * if it exists
               regex: /RCTBaseTextInputShadowViewMeasure\s*\(\s*struct\s+YGNode\s*\*\s*node,/g,
               replaceWith: 'RCTBaseTextInputShadowViewMeasure(YGNodeConstRef node,'
            }
          ]
        }
      ];

      filesToPatch.forEach(file => {
        applyStringPatch(file.path, file.replacements);
      });

      return configMod;
    },
  ]);

  return config;
};

module.exports = withSentryCppExceptions;
