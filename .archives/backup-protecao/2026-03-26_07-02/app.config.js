export default ({ config }) => {
  return {
    ...config,
    ios: {
      ...config.ios,
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST || config.ios?.googleServicesFile || "./GoogleService-Info.plist"
    },
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile || "./google-services.json"
    }
  };
};
