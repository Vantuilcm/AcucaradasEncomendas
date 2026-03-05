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
        config.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-incompatible-function-pointer-types'
        config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -Wno-incompatible-function-pointer-types'
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
      const yogaHeader = path.join(
        projectRoot,
        'node_modules',
        'react-native',
        'ReactCommon',
        'yoga',
        'yoga',
        'Yoga.h'
      );
      const textShadowView = path.join(
        projectRoot,
        'node_modules',
        'react-native',
        'Libraries',
        'Text',
        'Text',
        'RCTTextShadowView.m'
      );
      const shadowView = path.join(
        projectRoot,
        'node_modules',
        'react-native',
        'React',
        'Views',
        'RCTShadowView.m'
      );
      const baseTextInputShadowView = path.join(
        projectRoot,
        'node_modules',
        'react-native',
        'Libraries',
        'Text',
        'TextInput',
        'RCTBaseTextInputShadowView.m'
      );

      applyStringPatch(yogaHeader, [
        {
          from:
            'typedef YGSize (*YGMeasureFunc)(\n    YGNodeRef node,\n    float width,\n    YGMeasureMode widthMode,\n    float height,\n    YGMeasureMode heightMode);',
          to:
            'typedef YGSize (*YGMeasureFunc)(\n    YGNodeConstRef node,\n    float width,\n    YGMeasureMode widthMode,\n    float height,\n    YGMeasureMode heightMode);'
        }
      ]);

      applyStringPatch(textShadowView, [
        {
          from:
            'RCTTextShadowViewMeasure(YGNodeRef node, float width, YGMeasureMode widthMode, float height, YGMeasureMode heightMode)',
          to:
            'RCTTextShadowViewMeasure(YGNodeConstRef node, float width, YGMeasureMode widthMode, float height, YGMeasureMode heightMode)'
        }
      ]);

      applyStringPatch(shadowView, [
        {
          from:
            'RCTShadowViewMeasure(YGNodeRef node, float width, YGMeasureMode widthMode, float height, YGMeasureMode heightMode)',
          to:
            'RCTShadowViewMeasure(YGNodeConstRef node, float width, YGMeasureMode widthMode, float height, YGMeasureMode heightMode)'
        }
      ]);
      applyStringPatch(baseTextInputShadowView, [
        {
          from:
            'RCTBaseTextInputShadowViewMeasure(YGNodeRef node, float width, YGMeasureMode widthMode, float height, YGMeasureMode heightMode)',
          to:
            'RCTBaseTextInputShadowViewMeasure(YGNodeConstRef node, float width, YGMeasureMode widthMode, float height, YGMeasureMode heightMode)'
        }
      ]);

      return configMod;
    }
  ]);
};

function applyStringPatch(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const contents = fs.readFileSync(filePath, 'utf8');
  let updated = contents;
  replacements.forEach(({ from, to }) => {
    if (updated.includes(to)) {
      return;
    }
    if (updated.includes(from)) {
      updated = updated.replace(from, to);
    }
  });
  if (updated !== contents) {
    fs.writeFileSync(filePath, updated);
  }
}
