let withPodfile;
let withDangerousMod;
try {
  const configPlugins = require('@expo/config-plugins');
  withPodfile = configPlugins.withPodfile;
  withDangerousMod = configPlugins.withDangerousMod;
} catch (error) {
  withPodfile = undefined;
  withDangerousMod = undefined;
}
if (!withPodfile) {
  try {
    const iosPlugins = require('@expo/config-plugins/ios');
    withPodfile = iosPlugins.withPodfile;
  } catch (error) {
    withPodfile = undefined;
  }
}
if (!withDangerousMod) {
  try {
    const configPlugins = require('@expo/config-plugins');
    withDangerousMod = configPlugins.withDangerousMod;
  } catch (error) {
    withDangerousMod = undefined;
  }
}

const fs = require('fs');
const path = require('path');

const SNIPPET = `
    installer.pods_project.targets.each do |target|
      # Forçar flags de compatibilidade para TODOS os targets, especialmente React-RCTText e Yoga
      target.build_configurations.each do |config|
        config.build_settings['CLANG_WARN_INCOMPATIBLE_FUNCTION_POINTER_TYPES'] = 'NO'
        config.build_settings['GCC_WARN_INCOMPATIBLE_POINTER_TYPES'] = 'NO'
        
        cflags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
        unless cflags.include?('-Wno-incompatible-function-pointer-types')
          config.build_settings['OTHER_CFLAGS'] = "#{cflags} -Wno-incompatible-function-pointer-types -Wno-error=incompatible-function-pointer-types"
        end

        cxxflags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
        unless cxxflags.include?('-Wno-incompatible-function-pointer-types')
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "#{cxxflags} -Wno-incompatible-function-pointer-types -Wno-error=incompatible-function-pointer-types"
        end
      end

      # Sentry specific configurations
      if ['Sentry', 'SentryCrash'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['GCC_ENABLE_CPP_EXCEPTIONS'] = 'YES'
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
          config.build_settings['CLANG_CXX_LIBRARY'] = 'libc++'
        end
      end
    end
`;

function addOrUpdatePostInstall(contents) {
  // Sempre tenta atualizar o snippet para garantir que as flags mais recentes sejam aplicadas
  // Removemos a versão antiga se existir para evitar duplicação ou conflito
  let newContents = contents;
  
  if (contents.includes('CLANG_WARN_INCOMPATIBLE_FUNCTION_POINTER_TYPES')) {
    return contents;
  }

  const postInstallMatch = contents.match(/post_install do \|installer\|/);
  if (postInstallMatch) {
    return contents.replace(/post_install do \|installer\|/, match => `${match}${SNIPPET}`);
  }

  return `${contents}\npost_install do |installer|\n${SNIPPET}end\n`;
}

module.exports = function withSentryCppExceptions(config) {
  let updatedConfig = config;
  if (withPodfile) {
    updatedConfig = withPodfile(updatedConfig, configMod => {
      const contents = configMod.modResults.contents || '';
      const updated = addOrUpdatePostInstall(contents);
      if (updated !== contents) {
        configMod.modResults.contents = updated;
      }
      return configMod;
    });
  }

  if (!withDangerousMod) {
    return updatedConfig;
  }

  return withDangerousMod(updatedConfig, [
    'ios',
    async configMod => {
      const projectRoot = configMod.modRequest.projectRoot;

      // Lista de arquivos e seus patches com regex ultra-simplificado
      const patches = [
        {
          file: 'node_modules/react-native/ReactCommon/yoga/yoga/Yoga.h',
          find: /YGNodeRef\s+node,\s+float\s+width,\s+YGMeasureMode\s+widthMode/g,
          replace: 'YGNodeConstRef node, float width, YGMeasureMode widthMode'
        },
        {
          file: 'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
          find: /RCTBaseTextInputShadowViewMeasure\(\s*YGNodeRef\s+node/g,
          replace: 'RCTBaseTextInputShadowViewMeasure(YGNodeConstRef node'
        },
        {
          file: 'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m',
          find: /RCTTextInputShadowViewBaseline\(\s*YGNodeRef\s+node/g,
          replace: 'RCTTextInputShadowViewBaseline(YGNodeConstRef node'
        },
        {
          file: 'node_modules/react-native/React/Views/RCTShadowView.m',
          find: /RCTShadowViewMeasure\(\s*YGNodeRef\s+node/g,
          replace: 'RCTShadowViewMeasure(YGNodeConstRef node'
        }
      ];

      patches.forEach(patch => {
        const fullPath = path.join(projectRoot, patch.file);
        if (fs.existsSync(fullPath)) {
          let content = fs.readFileSync(fullPath, 'utf8');
          if (content.match(patch.find)) {
            content = content.replace(patch.find, patch.replace);
            fs.writeFileSync(fullPath, content);
          } else {
            // Se não encontrou o regex, pode ser que já esteja aplicado ou o arquivo mudou
            if (!content.includes('YGNodeConstRef')) {
              // Tentativa de fallback radical: substituir YGNodeRef por YGNodeConstRef em assinaturas de Measure
              if (patch.file.endsWith('.m')) {
                 const fallbackRegex = /Measure\(\s*YGNodeRef\s+node/g;
                 if (content.match(fallbackRegex)) {
                    content = content.replace(fallbackRegex, 'Measure(YGNodeConstRef node');
                    fs.writeFileSync(fullPath, content);
                 }
              }
            }
          }
        }
      });

      return configMod;
    }
  ]);
};
