const { withPodfile, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

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
  // Se já tiver o snippet, não faz nada
  if (contents.includes('Sentry C++ Exceptions & Yoga Fixes')) {
    return contents;
  }

  // Tenta encontrar um bloco post_install existente
  if (contents.match(/post_install do \|installer\|/)) {
    return contents.replace(
      /post_install do \|installer\|/,
      `post_install do |installer|\n${PODFILE_SNIPPET}`
    );
  }

  // Se não existir, cria um novo no final
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
  
  replacements.forEach(({ from, to }) => {
    if (updated.includes(to)) {
      return; // Já aplicado
    }
    if (updated.includes(from)) {
      updated = updated.replace(from, to);
      changed = true;
    } else {
      // Tenta uma busca mais flexível (ignorando espaços extras) se a exata falhar
      const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const regex = new RegExp(escapedFrom);
      if (regex.test(updated)) {
         updated = updated.replace(regex, to);
         changed = true;
      }
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, updated);
    console.log(`[withSentryCppExceptions] Patched ${path.basename(filePath)}`);
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
      
      // Paths para os arquivos que precisam de patch
      const filesToPatch = [
        {
          path: path.join(projectRoot, 'node_modules', 'react-native', 'ReactCommon', 'yoga', 'yoga', 'Yoga.h'),
          replacements: [{
            from: 'typedef YGSize (*YGMeasureFunc)(\n    YGNodeRef node,',
            to: 'typedef YGSize (*YGMeasureFunc)(\n    YGNodeConstRef node,'
          }]
        },
        {
          path: path.join(projectRoot, 'node_modules', 'react-native', 'Libraries', 'Text', 'Text', 'RCTTextShadowView.m'),
          replacements: [{
            from: 'RCTTextShadowViewMeasure(YGNodeRef node,',
            to: 'RCTTextShadowViewMeasure(YGNodeConstRef node,'
          }]
        },
        {
          path: path.join(projectRoot, 'node_modules', 'react-native', 'React', 'Views', 'RCTShadowView.m'),
          replacements: [{
            from: 'RCTShadowViewMeasure(YGNodeRef node,',
            to: 'RCTShadowViewMeasure(YGNodeConstRef node,'
          }]
        },
        {
          path: path.join(projectRoot, 'node_modules', 'react-native', 'Libraries', 'Text', 'TextInput', 'RCTBaseTextInputShadowView.m'),
          replacements: [{
            from: 'RCTBaseTextInputShadowViewMeasure(YGNodeRef node,',
            to: 'RCTBaseTextInputShadowViewMeasure(YGNodeConstRef node,'
          }]
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
