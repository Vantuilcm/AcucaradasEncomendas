export default ({ config }) => {
  const isProduction = process.env.APP_ENV === "production" || process.env.EXPO_PUBLIC_APP_ENV === "production";
  const isPreview = process.env.APP_ENV === "preview" || process.env.EXPO_PUBLIC_APP_ENV === "preview";

  // Incremento automático baseado no ambiente ou variável de build
  const buildNumber = "1170";
  const versionCode = 1170;

  return {
    ...config,
    version: "1.0.1", // Mantendo fixo conforme solicitado ou pode ser dinâmico
    ios: {
      ...config.ios,
      buildNumber: buildNumber.toString(),
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST || config.ios?.googleServicesFile || "./GoogleService-Info.plist"
    },
    android: {
      ...config.android,
      versionCode: versionCode,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile || "./google-services.json"
    },
    extra: {
      ...config.extra,
      env: isProduction ? "production" : isPreview ? "preview" : "development"
    }
  };
};
