export default ({ config }) => {
  const isProduction = process.env.APP_ENV === "production" || process.env.EXPO_PUBLIC_APP_ENV === "production";
  const isPreview = process.env.APP_ENV === "preview" || process.env.EXPO_PUBLIC_APP_ENV === "preview";
  const sentryEnabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === "true" || !!process.env.SENTRY_AUTH_TOKEN;

  // 1. DEFINIR FONTE DE VERDADE
  // package.json -> version
  // app.json -> ios.buildNumber e android.versionCode
  const buildNumber = config.ios?.buildNumber || "462";
  const versionCode = parseInt(buildNumber);

  const plugins = config.plugins || [];
  
  // Garantir que Sentry só esteja presente se estiver configurado
  const finalPlugins = plugins.filter(p => {
    if (typeof p === 'string' && p === '@sentry/react-native/expo') return sentryEnabled;
    if (Array.isArray(p) && p[0] === '@sentry/react-native/expo') return sentryEnabled;
    return true;
  });

  return {
    ...config,
    // Respeita o version do app.json (que vem do package.json via script ou manual)
    plugins: finalPlugins,
    ios: {
      ...config.ios,
      buildNumber: buildNumber.toString(),
      googleServicesFile: "./GoogleService-Info.plist"
    },
    android: {
      ...config.android,
      versionCode: versionCode,
      googleServicesFile: "./google-services.json"
    },
    extra: {
      ...config.extra,
      env: isProduction ? "production" : isPreview ? "preview" : "development"
    }
  };
};
