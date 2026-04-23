export default ({ config }) => {
  const isProduction = process.env.APP_ENV === "production" || process.env.EXPO_PUBLIC_APP_ENV === "production";
  const isPreview = process.env.APP_ENV === "preview" || process.env.EXPO_PUBLIC_APP_ENV === "preview";

  // Incremento automático baseado no ambiente ou variável de build
  const buildNumber = "1170";
  const versionCode = 1170;

  // Injetar plugins personalizados e atualizar configurações de plugins existentes
  const plugins = config.plugins || [];

  // 1. Garantir que o plugin de permissões iOS esteja presente
  if (!plugins.some(p => (Array.isArray(p) ? p[0] : p) === "./plugins/withIosPermissions")) {
    plugins.push("./plugins/withIosPermissions");
  }

  // 2. Configurar OneSignal plugin corretamente (Removendo appId inválido)
  const oneSignalIndex = plugins.findIndex(p => (Array.isArray(p) ? p[0] : p) === "onesignal-expo-plugin");
  if (oneSignalIndex !== -1) {
    plugins[oneSignalIndex] = ["onesignal-expo-plugin", { 
      mode: isProduction ? "production" : "development"
    }];
  }

  return {
    ...config,
    runtimeVersion: "1.0.1",
    plugins: plugins,
    version: "1.0.1",
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
      env: isProduction ? "production" : isPreview ? "preview" : "development",
      eas: {
        projectId: "6090106b-e327-4744-bce5-9ddb0d037045"
      }
    }
  };
};
