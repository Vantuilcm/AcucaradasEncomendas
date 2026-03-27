const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

const withAndroidNamespaceFix = (config) => {
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addResolutionStrategy(config.modResults.contents);
    }
    return config;
  });

  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = fixNamespaces(config.modResults.contents);
    }
    return config;
  });
};

function addResolutionStrategy(contents) {
  if (contents.includes('androidx.versionedparcelable:versionedparcelable')) {
    return contents;
  }

  // Adiciona a estratégia de resolução no final do bloco allprojects ou buildscript
  const resolutionStrategy = `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
            force 'androidx.annotation:annotation:1.2.0'
        }
    }
}
`;

  return contents + resolutionStrategy;
}

function fixNamespaces(contents) {
  // Isso é mais complexo pois precisa ser aplicado a cada módulo que falha.
  // Uma alternativa é forçar o namespace no build do app se o conflito for lá.
  return contents;
}

module.exports = withAndroidNamespaceFix;
