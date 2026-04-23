const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('crypto-browserify'),
  stream: require.resolve('stream-browserify'),
};

config.resolver.blockList = exclusionList([
  /node_modules_old\/.*/,
  /backup-protecao\/.*/,
  /temp_jest_v29\/.*/,
]);

config.resolver.sourceExts.push('mjs');

config.maxWorkers = 2;

module.exports = config;
