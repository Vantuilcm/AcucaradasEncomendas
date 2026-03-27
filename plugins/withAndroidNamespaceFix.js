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
            force 'androidx.core:core:1.13.1'
            force 'androidx.appcompat:appcompat:1.6.1'
            force 'androidx.vectordrawable:vectordrawable:1.1.0'
            force 'androidx.vectordrawable:vectordrawable-animated:1.1.0'
            force 'androidx.fragment:fragment:1.3.6'
        }
        // Excluir bibliotecas legadas que causam conflito de namespace
        exclude group: 'com.android.support'
    }
}
`;

  return contents + resolutionStrategy;
}

function fixNamespaces(contents) {
  // Adiciona ferramentas de manifest no início do arquivo
  if (!contents.includes('xmlns:tools="http://schemas.android.com/tools"')) {
    contents = contents.replace(
      /android \{/,
      'android {\n    namespace "com.acucaradas.encomendas"'
    );
  }

  // Adiciona a regra de substituição do appComponentFactory para evitar o conflito com Support Library
  const manifestFix = `
android.applicationVariants.all { variant ->
    variant.outputs.all { output ->
        output.processManifestProvider.get().doLast { manifest ->
            def manifestFiles = manifest.outputs.files.files
            manifestFiles.each { manifestFile ->
                if (manifestFile.exists() && manifestFile.name == "AndroidManifest.xml") {
                    def content = manifestFile.text
                    if (content.contains('<application') && !content.contains('tools:replace="android:appComponentFactory"')) {
                        content = content.replace('<application', '<application tools:replace="android:appComponentFactory" xmlns:tools="http://schemas.android.com/tools"')
                        manifestFile.text = content
                    }
                }
            }
        }
    }
}
`;

  if (!contents.includes('tools:replace="android:appComponentFactory"')) {
    return contents + manifestFix;
  }
  return contents;
}

module.exports = withAndroidNamespaceFix;
