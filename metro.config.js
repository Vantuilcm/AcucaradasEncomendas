const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 🛡️ [METRO-ENTERPRISE] Configuração Robusta contra Arquivos Duplicados
config.resolver.blockList = [
  // Pastas de arquivos arquivados/backups
  /\.archives\/.*/,
  /backup-protecao\/.*/,
  /node_modules_old\/.*/,
  /project-old\/.*/,
  /src antigo\/.*/,
  /src copy\/.*/,
  /test-2fa\/.*/,
  
  // Pastas de testes e mocks que podem conflitar
  /__mocks__\/.*/,
  /src\/__mocks__\/.*/,
  /src\/services\/__mocks__\/.*/,
  
  // Pastas temporárias e de sistema
  /\.github\/.*/,
  /docs\/.*/,
  /play-store-.*\/.*/,
  /relatorios-seguranca\/.*/,
  /temp_jest_v29\/.*/,
  
  // Caches
  /\.expo\/.*/,
  /\.eas\/.*/
];

// Garantir que Metro não tente resolver módulos fora da raiz de forma indevida
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

module.exports = config;
