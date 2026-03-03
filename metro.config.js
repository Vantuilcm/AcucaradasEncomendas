const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  /node_modules_old\/.*/,
  /node_modules\/firebase\/app-check\/dist\/esm\/functions\/.*/,
  /\.git\/.*/,
  /android\/.*/,
  /ios\/.*/,
  /build\/.*/,
  /\.expo\/.*/
]);

config.maxWorkers = 2;

module.exports = config;
