const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 🛡️ [METRO-STABLE] Exclusão cirúrgica de pastas que causam "Duplicated files or mocks"
config.resolver.blockList = [
  /node_modules_old\/.*/,
  /backup-protecao\/.*/,
  /temp_jest_v29\/.*/,
  /test-2fa\/.*/,
  /__mocks__\/.*/,
  /project-old\/.*/,
  /src antigo\/.*/,
  /src copy\/.*/,
  /\.github\/.*/,
  /docs\/.*/,
  /play-store-.*\/.*/,
  /relatorios-seguranca\/.*/
];

module.exports = config;
