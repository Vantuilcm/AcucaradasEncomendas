import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Açucaradas Encomendas",
  slug: "acucaradas-encomendas",
  version: "1.1.5",
  orientation: "portrait",
  icon: "./assets/app-icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier: "com.acucaradas.encomendas",
    buildNumber: "456", // Controlado pelo scripts/version-bump.js
    appleTeamId: "7L68YF5S29",
    entitlements: {
      "com.apple.developer.applesignin": ["Default"]
    },
    usesAppleSignIn: true,
    infoPlist: {
      NSCameraUsageDescription: "Este aplicativo usa a câmera para escanear códigos QR e tirar fotos dos produtos.",
      NSPhotoLibraryUsageDescription: "Este aplicativo precisa acessar sua galeria para selecionar imagens para os produtos.",
      NSPhotoLibraryAddUsageDescription: "Este aplicativo precisa salvar fotos na sua galeria.",
      NSMicrophoneUsageDescription: "Este aplicativo usa o microfone para gravar notas de voz para os pedidos.",
      NSSpeechRecognitionUsageDescription: "Este aplicativo pode usar reconhecimento de fala para facilitar a busca de produtos por voz.",
      NSLocationWhenInUseUsageDescription: "Este aplicativo usa sua localização para encontrar confeitarias próximas e calcular o tempo de entrega.",
      NSUserTrackingUsageDescription: "Este aplicativo usa dados de uso para melhorar sua experiência e oferecer conteúdo personalizado.",
      UIBackgroundModes: ["remote-notification"],
      ITSAppUsesNonExemptEncryption: false
    },
    googleServicesFile: "./GoogleService-Info.plist"
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: "./assets/app-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.acucaradas.encomendas",
    versionCode: 456, // Sincronizado com iOS
    permissions: [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "ACCESS_FINE_LOCATION",
      "RECORD_AUDIO"
    ],
    googleServicesFile: "./google-services.json"
  }
});
