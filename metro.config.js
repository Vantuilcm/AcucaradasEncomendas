const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configuração de aliases via extraNodeModules
config.resolver.extraNodeModules = {
  '@': path.resolve(__dirname, 'src'),
  'expo-modules-core': path.resolve(__dirname, 'node_modules', 'expo-modules-core', 'src'),
};

// Adicionar extensões necessárias para bibliotecas modernas
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const root = escapeRegex(__dirname);
const rootDirPattern = dir => new RegExp(`${root}[\\/]${escapeRegex(dir)}[\\/].*$`);

config.resolver.blockList = exclusionList([
  rootDirPattern('node_modules_old'),
  rootDirPattern('build-artifacts'),
  rootDirPattern('dist'),
  rootDirPattern('build-logs'),
]);

module.exports = config;
