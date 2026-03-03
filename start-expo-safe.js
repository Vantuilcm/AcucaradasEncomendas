/**
 * Script para iniciar o Expo com configurações seguras
 * Contorna problemas de watch mode do Metro bundler
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando Expo com configurações seguras...');

// Definir variáveis de ambiente necessárias
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
process.env.EXPO_METRO_MIN_NODE_MODULES_PATHS = '1';
process.env.EXPO_METRO_CACHE = 'false';

// Verificar se o metro.config.js existe e tem as configurações corretas
const metroConfigPath = path.join(process.cwd(), 'metro.config.js');
if (!fs.existsSync(metroConfigPath)) {
  console.log('❌ Arquivo metro.config.js não encontrado. Criando...');
  
  const metroConfig = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Desativar completamente o Watchman
  watchFolderRoot: null,
  reporter: null,
  resetCache: true,
});

// Configurações adicionais para resolver problemas do Metro Bundler
config.resolver.assetExts = [...config.resolver.assetExts, 'cjs'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'ts', 'tsx'];

// Limitar o número de workers para evitar sobrecarga em sistemas com recursos limitados
config.maxWorkers = 2;

// Configuração simplificada para evitar erros de 'Failed to start watch mode'
config.watchFolders = [path.resolve(__dirname)];

// Desativar completamente o Watchman
config.server = {
  ...config.server,
  useWatchman: false,
};

// Configuração simplificada do watcher
config.watcher = {
  useWatchman: false,
  watchman: {
    enabled: false
  },
  // Usar NodeWatcher em todas as plataformas
  nodeWatcher: true,
  fsEventsWatcher: false,
  // Desativar healthCheck
  healthCheck: {
    enabled: false
  },
  // Aumentar o intervalo de polling
  pollingInterval: 2000
};

// Aumentar o tempo limite para evitar erros de timeout
config.cacheStores = [];
config.resetCache = true;

module.exports = config;
`;
  
  fs.writeFileSync(metroConfigPath, metroConfig);
  console.log('✅ metro.config.js criado com sucesso!');
}

// Limpar caches antes de iniciar
try {
  console.log('🧹 Limpando caches...');
  execSync('npx expo-doctor clear-cache', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️ Aviso: Não foi possível limpar o cache do Expo. Continuando...');
}

// Iniciar o Expo com configurações seguras
console.log('\n🚀 Iniciando o Expo...');

const args = ['expo', 'start'];

// Adicionar a flag --web se solicitado
if (process.argv.includes('--web')) {
  args.push('--web');
  console.log('🌐 Modo web ativado');
}

// Definir porta específica para evitar conflitos
args.push('--port', '8082');
console.log('🔌 Usando porta 8082');

// Adicionar a flag --clear para limpar o cache
args.push('--clear');

// Adicionar a flag --no-dev para melhor desempenho
args.push('--no-dev');

// Adicionar a flag --minify para reduzir o tamanho do bundle
args.push('--minify');

// Iniciar o processo do Expo
const expoProcess = spawn('npx', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_METRO_CACHE: 'false',
    EXPO_METRO_MIN_NODE_MODULES_PATHS: '1',
    NODE_OPTIONS: '--max-old-space-size=4096'
  }
});

expoProcess.on('error', (error) => {
  console.error('❌ Erro ao iniciar o Expo:', error.message);
  process.exit(1);
});

expoProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ O processo do Expo encerrou com código de saída ${code}`);
  }
  process.exit(code);
});

// Capturar sinais para encerrar o processo corretamente
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando o Expo...');
  expoProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando o Expo...');
  expoProcess.kill('SIGTERM');
});
