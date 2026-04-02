export default ({ config }) => {
  const isProduction = process.env.APP_ENV === "production" || process.env.EXPO_PUBLIC_APP_ENV === "production";
  const isPreview = process.env.APP_ENV === "preview" || process.env.EXPO_PUBLIC_APP_ENV === "preview";
  const sentryEnabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === "true" || !!process.env.SENTRY_AUTH_TOKEN;

  // Incremento automático baseado no ambiente ou variável de build
  // Usamos o valor do app.json como base para evitar conflitos com builds manuais anteriores
  const baseVersion = parseInt(config.ios?.buildNumber || config.android?.versionCode || "400");
  const runNumber = process.env.GITHUB_RUN_NUMBER ? parseInt(process.env.GITHUB_RUN_NUMBER) : 0;
  
  // Se o runNumber for muito baixo (ex: recém resetado), usamos a base do app.json + runNumber
  // Isso garante que sempre subiremos a versão
  const buildNumberValue = Math.max(baseVersion, (runNumber || 0) + 390); 
  const buildNumber = buildNumberValue.toString();
  const versionCode = buildNumberValue;

  const plugins = config.plugins || [];
  
  // Garantir que Sentry só esteja presente se estiver configurado
  const finalPlugins = plugins.filter(p => {
    if (typeof p === 'string' && p === '@sentry/react-native/expo') return sentryEnabled;
    if (Array.isArray(p) && p[0] === '@sentry/react-native/expo') return sentryEnabled;
    return true;
  });

  return {
    ...config,
    version: config.version || "1.1.1",
    plugins: finalPlugins,
    ios: {
      ...config.ios,
      buildNumber: buildNumber.toString(),
      // Sempre usar o caminho do arquivo, não o conteúdo da env var
      googleServicesFile: "./GoogleService-Info.plist"
    },
    android: {
      ...config.android,
      versionCode: versionCode,
      // Sempre usar o caminho do arquivo, não o conteúdo da env var
      googleServicesFile: "./google-services.json"
    },
    extra: {
      ...config.extra,
      env: isProduction ? "production" : isPreview ? "preview" : "development"
    }
  };
};
