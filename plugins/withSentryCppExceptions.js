const fs = require('fs');
const path = require('path');

// Tentar importar de @expo/config-plugins
let withPodfile, withDangerousMod;

try {
  const configPlugins = require('@expo/config-plugins');
  withPodfile = configPlugins.withPodfile;
  withDangerousMod = configPlugins.withDangerousMod;
} catch (error) {
  // Ignorar erro inicial
}

// Fallback para @expo/config-plugins/ios se necessário
if (!withPodfile) {
  try {
    // Tenta importar diretamente do subcaminho ios (comum em algumas versões)
    // ou tenta encontrar via require.resolve para garantir
    try {
      const iosPlugins = require('@expo/config-plugins/build/ios');
      withPodfile = iosPlugins.withPodfile;
    } catch (e) {
      const iosPlugins = require('@expo/config-plugins/ios');
      withPodfile = iosPlugins.withPodfile;
    }
  } catch (error) {
    console.warn('[withSentryCppExceptions] Aviso: Não foi possível carregar withPodfile de @expo/config-plugins/ios');
  }
}

// Fallback para withDangerousMod
if (!withDangerousMod) {
  try {
    const configPlugins = require('@expo/config-plugins');
    withDangerousMod = configPlugins.withDangerousMod;
  } catch (error) {
     // Tenta carregar do base se falhar
     try {
       const basePlugins = require('@expo/config-plugins/build/plugins/withDangerousMod');
       withDangerousMod = basePlugins.withDangerousMod;
     } catch (e) {
       console.warn('[withSentryCppExceptions] Aviso: Não foi possível carregar withDangerousMod');
     }
  }
}

// Se ainda falhar, define mocks para não quebrar a config (mas o build vai falhar depois)
if (!withPodfile) {
  withPodfile = (config) => config;
  console.error('[withSentryCppExceptions] ERRO CRÍTICO: withPodfile não encontrado!');
}
if (!withDangerousMod) {
  withDangerousMod = (config) => config;
  console.error('[withSentryCppExceptions] ERRO CRÍTICO: withDangerousMod não encontrado!');
}

const PODFILE_SNIPPET = `
    # Sentry C++ Exceptions & Yoga Fixes
    installer.pods_project.targets.each do |target|
      if ['Sentry', 'SentryCrash'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['GCC_ENABLE_CPP_EXCEPTIONS'] = 'YES'
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
          config.build_settings['CLANG_CXX_LIBRARY'] = 'libc++'
        end
      end
      
      # Apply global C++ flags to fix 'terminate_handler' issues
      target.build_configurations.each do |config|
        config.build_settings['CLANG_WARN_INCOMPATIBLE_FUNCTION_POINTER_TYPES'] = 'NO'
        
        cflags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
        unless cflags.include?('-Wno-incompatible-function-pointer-types')
          config.build_settings['OTHER_CFLAGS'] = "#{cflags} -Wno-incompatible-function-pointer-types"
        end
        
        cppflags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
        unless cppflags.include?('-include exception')
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "#{cppflags} -Wno-incompatible-function-pointer-types -include exception"
        end
      end
    end
`;

function addPostInstallBlock(contents) {
  if (contents.includes('Sentry C++ Exceptions & Yoga Fixes')) {
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
