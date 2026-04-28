export default ({ config }) => {
  const isProduction = process.env.APP_ENV === "production" || process.env.EXPO_PUBLIC_APP_ENV === "production";
  const isPreview = process.env.APP_ENV === "preview" || process.env.EXPO_PUBLIC_APP_ENV === "preview";

  // FORÇAR BUILD NUMBER REAL - MISSÃO APPLE 1195
  const buildNumber = "1195";
  const versionCode = 1195;
  const version = "1.1.8";

  // Obter commit hash real ou placeholder
  const commitSha = process.env.GITHUB_SHA 
    ? process.env.GITHUB_SHA.substring(0, 7) 
    : "local";

  // Injetar plugins personalizados e atualizar configurações de plugins existentes
  const plugins = config.plugins || [];

  // 1. Garantir que o plugin de permissões iOS esteja presente
  if (!plugins.some(p => (Array.isArray(p) ? p[0] : p) === "./plugins/withIosPermissions")) {
    plugins.push("./plugins/withIosPermissions");
  }

  // 2. Configurar OneSignal plugin corretamente
  const oneSignalIndex = plugins.findIndex(p => (Array.isArray(p) ? p[0] : p) === "onesignal-expo-plugin");
  if (oneSignalIndex !== -1) {
    plugins[oneSignalIndex] = ["onesignal-expo-plugin", { 
      mode: isProduction ? "production" : "development"
    }];
  }

  // Merge do infoPlist para garantir que as keys de privacidade NUNCA sejam sobrescritas
  const infoPlist = {
    ...(config.ios?.infoPlist || {}),
    NSSpeechRecognitionUsageDescription: "Usamos reconhecimento de voz para facilitar interações e melhorar sua experiência.",
    NSLocationWhenInUseUsageDescription: "Usamos sua localização para mostrar lojas, produtores e entregadores próximos.",
    NSCameraUsageDescription: "Este aplicativo usa a câmera para escanear códigos QR e tirar fotos dos produtos.",
    NSPhotoLibraryUsageDescription: "Este aplicativo precisa acessar sua galeria para selecionar imagens para os produtos.",
    NSMicrophoneUsageDescription: "Este aplicativo usa o microfone para gravar notas de voz para os pedidos."
  };

  return {
    ...config,
    owner: "acucaradaencomendas",
    runtimeVersion: "1.0.1",
    plugins: plugins,
    version: version,
    ios: {
      ...config.ios,
      buildNumber: buildNumber,
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: infoPlist
    },
    android: {
      ...config.android,
      versionCode: versionCode,
      googleServicesFile: "./google-services.json"
    },
    extra: {
      ...config.extra,
      env: isProduction ? "production" : isPreview ? "preview" : "development",
      commitSha: commitSha,
      buildNumber: buildNumber,
      eas: {
        projectId: "6090106b-e327-4744-bce5-9ddb0d037045"
      }
    }
  };
};
