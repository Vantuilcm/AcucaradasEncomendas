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
      target.build_configurations.each do |config|
        # Fix for Xcode 15 incompatible function pointer types
        config.build_settings['CLANG_WARN_INCOMPATIBLE_FUNCTION_POINTER_TYPES'] = 'NO'
        config.build_settings['GCC_WARN_INCOMPATIBLE_POINTER_TYPES'] = 'NO'
        
        # Garantir que as flags de supressão estejam presentes
        current_cflags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
        unless current_cflags.include?('-Wno-incompatible-function-pointer-types')
          config.build_settings['OTHER_CFLAGS'] = "#{current_cflags} -Wno-incompatible-function-pointer-types -Wno-error=incompatible-function-pointer-types"
        end

        current_cxxflags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
        unless current_cxxflags.include?('-Wno-incompatible-function-pointer-types')
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "#{current_cxxflags} -Wno-incompatible-function-pointer-types -Wno-error=incompatible-function-pointer-types"
        end
      end

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
  if (contents.includes('CLANG_WARN_INCOMPATIBLE_FUNCTION_POINTER_TYPES')) {
    // Se já tem, vamos substituir o bloco inteiro para garantir que as novas flags sejam aplicadas
    return contents; 
  }

  const postInstallMatch = contents.match(/post_install do \|installer\|/);
  if (postInstallMatch) {
    console.log('[withSentryCppExceptions] Adicionando snippet ao post_install existente');
    return contents.replace(/post_install do \|installer\|/, match => `${match}${SNIPPET}`);
  }

  console.log('[withSentryCppExceptions] Criando novo bloco post_install');
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
      
      const filesToPatch = [
        {
          name: 'Yoga.h',
          path: path.join(projectRoot, 'node_modules/react-native/ReactCommon/yoga/yoga/Yoga.h'),
          replacements: [
            {
              from: /typedef\s+YGSize\s+\(\*YGMeasureFunc\)\(\s*YGNodeRef\s+node/g,
              to: 'typedef YGSize (*YGMeasureFunc)(YGNodeConstRef node'
            },
            {
              from: /typedef\s+float\s+\(\*YGBaselineFunc\)\(\s*YGNodeRef\s+node/g,
              to: 'typedef float (*YGBaselineFunc)(YGNodeConstRef node'
            }
          ]
        },
        {
          name: 'RCTBaseTextInputShadowView.m',
          path: path.join(projectRoot, 'node_modules/react-native/Libraries/Text/TextInput/RCTBaseTextInputShadowView.m'),
          replacements: [
            {
              from: /static\s+YGSize\s+RCTBaseTextInputShadowViewMeasure\s*\(\s*YGNodeRef\s+node/g,
              to: 'static YGSize RCTBaseTextInputShadowViewMeasure(YGNodeConstRef node'
            },
            {
              from: /static\s+float\s+RCTTextInputShadowViewBaseline\s*\(\s*YGNodeRef\s+node/g,
              to: 'static float RCTTextInputShadowViewBaseline(YGNodeConstRef node'
            }
          ]
        },
        {
          name: 'RCTShadowView.m',
          path: path.join(projectRoot, 'node_modules/react-native/React/Views/RCTShadowView.m'),
          replacements: [
            {
              from: /RCTShadowViewMeasure\s*\(\s*YGNodeRef\s+node/g,
              to: 'RCTShadowViewMeasure(YGNodeConstRef node'
            }
          ]
        },
        {
          name: 'RCTTextShadowView.m',
          path: path.join(projectRoot, 'node_modules/react-native/Libraries/Text/Text/RCTTextShadowView.m'),
          replacements: [
            {
              from: /RCTTextShadowViewMeasure\s*\(\s*YGNodeRef\s+node/g,
              to: 'RCTTextShadowViewMeasure(YGNodeConstRef node'
            }
          ]
        }
      ];

      filesToPatch.forEach(file => {
        if (fs.existsSync(file.path)) {
          console.log(`[withSentryCppExceptions] Aplicando patch em ${file.name}`);
          applyStringPatch(file.path, file.replacements);
        } else {
          console.warn(`[withSentryCppExceptions] Arquivo não encontrado: ${file.path}`);
        }
      });

      return configMod;
    }
  ]);
};

function applyStringPatch(filePath, replacements) {
  const contents = fs.readFileSync(filePath, 'utf8');
  let updated = contents;
  replacements.forEach(({ from, to }) => {
    if (updated.includes(to)) {
      return;
    }

    if (from instanceof RegExp) {
      if (from.test(updated)) {
        updated = updated.replace(from, to);
      }
    } else if (updated.includes(from)) {
      updated = updated.replace(from, to);
    }
  });
  if (updated !== contents) {
    fs.writeFileSync(filePath, updated);
  }
}
