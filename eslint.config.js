// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "node_modules/*",
      "node_modules_old/*",
      "test/*",
      "tests/*",
      "**/__tests__/*",
      "**/*.test.*",
      "**/*.spec.*",
      "scripts/*",
      "start-*.js",
      "test-*.js",
      "test-2fa/**",
      "utils.js",
      "verificar-conflitos-npm.js",
      "verificar-dependencias.js",
      "web-server.js",
      "webpack.config.js",
      "src/utils/OneSignalTest.ts",
      "src/utils/notificationSettingsMigration.ts",
      "src/utils/mobile-security.js",
      "src/utils/protecoes-adicionais.js"
    ],
  }
]);
