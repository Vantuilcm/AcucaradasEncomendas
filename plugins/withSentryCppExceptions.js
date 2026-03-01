const { withPodfile } = require('@expo/config-plugins');

const SNIPPET = `  installer.pods_project.targets.each do |target|
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
  if (contents.includes('GCC_ENABLE_CPP_EXCEPTIONS')) {
    return contents;
  }

  const postInstallMatch = contents.match(/post_install do \|installer\|\n/);
  if (postInstallMatch) {
    return contents.replace(/post_install do \|installer\|\n/, match => `${match}${SNIPPET}`);
  }

  return `${contents}\npost_install do |installer|\n${SNIPPET}end\n`;
}

module.exports = function withSentryCppExceptions(config) {
  return withPodfile(config, configMod => {
    const contents = configMod.modResults.contents || '';
    const updated = addOrUpdatePostInstall(contents);
    if (updated !== contents) {
      configMod.modResults.contents = updated;
    }
    return configMod;
  });
};
