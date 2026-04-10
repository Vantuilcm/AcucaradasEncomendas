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

  // 🛡️ [FIREBASE-GUARD] Validação de Segredos Críticos
  let firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  let firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "acucaradas-encomendas";
  let firebaseAppId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

  // 🍎 [IOS-PLIST-FALLBACK] Tentar ler do plist se estiver no iOS build
  if (!firebaseApiKey || !firebaseAppId) {
    try {
      const plistPath = path.resolve(process.cwd(), 'GoogleService-Info.plist');
      if (fs.existsSync(plistPath)) {
        const plistContent = fs.readFileSync(plistPath, 'utf-8');
        const apiKeyMatch = plistContent.match(/<key>API_KEY<\/key>\s*<string>(.*)<\/string>/);
        const appIdMatch = plistContent.match(/<key>GOOGLE_APP_ID<\/key>\s*<string>(.*)<\/string>/);
        const projectIdMatch = plistContent.match(/<key>PROJECT_ID<\/key>\s*<string>(.*)<\/string>/);
        
        if (apiKeyMatch && !firebaseApiKey) firebaseApiKey = apiKeyMatch[1];
        if (appIdMatch && !firebaseAppId) firebaseAppId = appIdMatch[1];
        if (projectIdMatch && (!firebaseProjectId || firebaseProjectId.length < 5)) firebaseProjectId = projectIdMatch[1];
        
        console.log("🩹 [PLIST-RECOVERY] Firebase config recovered from GoogleService-Info.plist");
      }
    } catch (e) {
      console.warn("⚠️ [WARN] Falha ao tentar ler GoogleService-Info.plist para fallback.");
    }
  }

  if (!firebaseApiKey) {
    console.warn("⚠️ [FIREBASE_CRITICAL] Nenhuma API Key encontrada no ENV ou no Plist!");
  } else {
    console.log(`✅ [FIREBASE_AUDIT] API Key: ${firebaseApiKey.substring(0, 6)}...${firebaseApiKey.substring(firebaseApiKey.length - 4)}`);
    console.log(`✅ [FIREBASE_AUDIT] Project ID: ${firebaseProjectId}`);
  }

  const plugins = config.plugins || [];
  const appPlugins = appConfig.plugins || [];
  
  // Mesclar plugins do appConfig.json com os do app.json
  const combinedPlugins = [...new Set([...plugins, ...appPlugins])];

  const finalPlugins = combinedPlugins.filter(p => {
    if (typeof p === 'string' && p === '@sentry/react-native/expo') return sentryEnabled;
    if (Array.isArray(p) && p[0] === '@sentry/react-native/expo') return sentryEnabled;
    return true;
  });

  return {
    ...config,
    version: appVersion,
    name: appConfig.name,
    slug: appConfig.slug,
    icon: appConfig.icon || config.icon || "./assets/app-icon.png",
    splash: appConfig.splash || config.splash || {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    scheme: appConfig.scheme || "acucaradas",
    owner: "acucaradaencomendas",
    ios: {
      ...config.ios,
      bundleIdentifier: appConfig.bundleIdentifier,
      buildNumber: buildNumber.toString(),
      googleServicesFile: appConfig.firebase.ios,
      infoPlist: {
        ...(config.ios?.infoPlist || {}),
        ...(appConfig.infoPlist || {})
      }
    },
    android: {
      ...config.android,
      package: appConfig.package,
      versionCode: versionCode,
      adaptiveIcon: {
        foregroundImage: appConfig.icon || "./assets/app-icon.png",
        backgroundColor: "#ffffff"
      },
      googleServicesFile: appConfig.firebase.android
    },
    extra: {
      ...config.extra,
      eas: {
        projectId: appConfig.id
      },
      env: isProduction ? "production" : isPreview ? "preview" : "development",
      firebaseApiKey: firebaseApiKey,
      firebaseAppId: firebaseAppId,
      firebaseProjectId: firebaseProjectId,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || `${firebaseProjectId}.firebaseapp.com`,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || `${firebaseProjectId}.firebasestorage.app`,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    },
    plugins: finalPlugins
  };
};
