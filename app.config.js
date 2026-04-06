const fs = require('fs');
const path = require('path');

export default ({ config }) => {
  // 1. CARREGAR CONFIGURAÇÃO MULTI-APP
  const appsConfigPath = path.resolve(process.cwd(), 'apps.config.json');
  const appsConfig = JSON.parse(fs.readFileSync(appsConfigPath, 'utf-8'));
  
  const targetAppId = process.env.TARGET_APP || appsConfig.defaultApp;
  const appConfig = appsConfig.apps[targetAppId];
  
  if (!appConfig) {
    throw new Error(`[ORCHESTRATOR] App ${targetAppId} não encontrado no apps.config.json`);
  }

  const isProduction = process.env.APP_ENV === "production" || process.env.EXPO_PUBLIC_APP_ENV === "production";
  const isPreview = process.env.APP_ENV === "preview" || process.env.EXPO_PUBLIC_APP_ENV === "preview";
  const sentryEnabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === "true" || !!process.env.SENTRY_AUTH_TOKEN;

  // 2. SINCRONIZAÇÃO DE VERSÃO (MODO VERSION-LOCK)
  // Única fonte de verdade: version-state.json ou variáveis de ambiente injetadas
  let versionState;
  try {
    versionState = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'version-state.json'), 'utf-8'));
  } catch (e) {
    versionState = { version: config.version, buildNumber: parseInt(config.ios?.buildNumber || "1") };
  }

  const buildNumber = process.env.BUILD_NUMBER || process.env.CURRENT_BN || versionState.buildNumber.toString();
  const versionCode = parseInt(process.env.VERSION_CODE || buildNumber);
  const appVersion = versionState.version || config.version;

  console.log(`🚀 [VERSION-LOCK] Configurando App: ${appConfig.name} (v${appVersion} - BN:${buildNumber} / VC:${versionCode})`);

  const plugins = config.plugins || [];
  const finalPlugins = plugins.filter(p => {
    if (typeof p === 'string' && p === '@sentry/react-native/expo') return sentryEnabled;
    if (Array.isArray(p) && p[0] === '@sentry/react-native/expo') return sentryEnabled;
    return true;
  });

  return {
    ...config,
    version: appVersion,
    name: appConfig.name,
    slug: appConfig.slug,
    ios: {
      ...config.ios,
      bundleIdentifier: appConfig.bundleIdentifier,
      buildNumber: buildNumber.toString(),
      googleServicesFile: appConfig.firebase.ios
    },
    android: {
      ...config.android,
      package: appConfig.package,
      versionCode: versionCode,
      googleServicesFile: appConfig.firebase.android
    },
    extra: {
      ...config.extra,
      eas: {
        projectId: appConfig.id
      },
      env: isProduction ? "production" : isPreview ? "preview" : "development"
    },
    plugins: finalPlugins
  };
};
