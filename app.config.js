export default ({ config }) => {
  const isProduction = process.env.APP_ENV === "production" || process.env.EXPO_PUBLIC_APP_ENV === "production";
  const isPreview = process.env.APP_ENV === "preview" || process.env.EXPO_PUBLIC_APP_ENV === "preview";

  // Incremento automático baseado no ambiente ou variável de build
  const buildNumber = process.env.GITHUB_RUN_NUMBER || config.ios?.buildNumber || "1";
  const versionCode = process.env.GITHUB_RUN_NUMBER ? parseInt(process.env.GITHUB_RUN_NUMBER) : (config.android?.versionCode || 1);

  return {
    ...config,
    version: config.version || "1.1.1",
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
