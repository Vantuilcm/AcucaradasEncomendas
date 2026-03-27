const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for React Native 0.76+ new architecture and Hermes
config.resolver.sourceExts.push('mjs');

config.maxWorkers = 2;

module.exports = config;
