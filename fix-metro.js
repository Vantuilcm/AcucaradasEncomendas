// Script para corrigir problemas do Metro Bundler
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Iniciando correção de problemas do Metro Bundler...');

// Função para criar um backup do arquivo
function backupFile(filePath) {
  const backupPath = `${filePath}.backup`;
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Backup criado: ${backupPath}`);
  }
}

// Corrigir metro.config.js
const metroConfigPath = path.join(__dirname, 'metro.config.js');
backupFile(metroConfigPath);

// Criar uma configuração simplificada do Metro
const metroConfig = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('@expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configurações adicionais para resolver problemas do Metro Bundler
config.resolver.assetExts = [...config.resolver.assetExts, 'cjs'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'ts', 'tsx'];

// Limitar o número de workers para evitar sobrecarga em sistemas com recursos limitados
config.maxWorkers = 4;

module.exports = config;
`;

fs.writeFileSync(metroConfigPath, metroConfig);
console.log(`✅ metro.config.js corrigido`);

// Limpar caches
console.log('🧹 Limpando caches...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ Cache do NPM limpo');
  
  // Remover pastas de cache
  const cacheFolders = [
    '.expo',
    'node_modules/.cache',
    '.babel-cache'
  ];
  
  cacheFolders.forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    if (fs.existsSync(folderPath)) {
      try {
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log(`✅ Pasta removida: ${folder}`);
      } catch (err) {
        console.error(`❌ Erro ao remover ${folder}:`, err.message);
      }
    }
  });
} catch (err) {
  console.error('❌ Erro ao limpar caches:', err.message);
}

console.log('\n🚀 Correções aplicadas! Execute os seguintes comandos para iniciar o aplicativo:');
console.log('1. npm install');
console.log('2. npx expo start --clear');