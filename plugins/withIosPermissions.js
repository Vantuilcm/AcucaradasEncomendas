const { withInfoPlist } = require("@expo/config-plugins");

/**
 * 💉 ExpoConfigPluginPrivacyFixAI
 * Injeta as chaves de privacidade obrigatórias diretamente no processo de prebuild do Expo.
 * Isso garante que as permissões sobrevivam ao CNG e estejam presentes na IPA final.
 */
module.exports = function withIosPermissions(config) {
  return withInfoPlist(config, (config) => {
    console.log("💉 [PLUGIN] Injetando permissões de privacidade no Info.plist...");

    config.modResults.NSSpeechRecognitionUsageDescription =
      "Este aplicativo utiliza o reconhecimento de voz para permitir buscas de produtos e navegação por voz.";

    config.modResults.NSLocationWhenInUseUsageDescription =
      "Sua localização é utilizada para exibir lojas próximas e calcular valores de entrega.";

    config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
      "Sua localização é utilizada para oferecer uma experiência personalizada de entrega mesmo em segundo plano.";

    config.modResults.NSLocationAlwaysUsageDescription =
      "Este aplicativo precisa da sua localização para otimizar o rastreamento da entrega e informar sobre promoções.";

    config.modResults.NSCameraUsageDescription =
      "O acesso à câmera permite capturar fotos para o seu perfil e pedidos.";

    config.modResults.NSPhotoLibraryUsageDescription =
      "O acesso à galeria permite selecionar fotos para o seu perfil e pedidos.";

    config.modResults.NSMicrophoneUsageDescription =
      "O acesso ao microfone é necessário para comandos de voz e buscas.";    

    return config;
  });
};
