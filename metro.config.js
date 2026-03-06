const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Identifica o caminho absoluto para a pasta 'build' local para evitar excluir o projeto todo no CI
// No EAS Build, o diretório de trabalho pode conter 'build' no nome (ex: /Users/expo/workingdir/build)
// Usar apenas /build\/.*/ no regex bloquearia todos os arquivos do projeto!
const localBuildPath = path.join(__dirname, 'build');
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

config.resolver.blockList = exclusionList([
  /node_modules_old\/.*/,
  /node_modules\/firebase\/app-check\/dist\/esm\/functions\/.*/,
  /\.git\/.*/,
  /android\/.*/,
  /ios\/.*/,
  // Exclui apenas a pasta build DENTRO do projeto, usando caminho absoluto
  new RegExp(`^${escapeRegExp(localBuildPath)}\/.*`),
  /\.expo\/.*/
]);

config.maxWorkers = 2;

module.exports = config;
