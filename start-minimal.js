/**
 * Script minimalista para iniciar o Expo
 * Contorna problemas comuns do Metro bundler
 */

const { spawn } = require('child_process');

console.log('🚀 Iniciando Expo em modo minimalista...');

// Definir variáveis de ambiente para melhorar a estabilidade
process.env.NODE_OPTIONS = '--max-old-space-size=4096';
process.env.EXPO_METRO_CACHE = 'false';

// Configurar argumentos para o Expo
const args = [
  'expo',
  'start',
  '--port', '8082',  // Usar porta específica
  '--clear',         // Limpar cache
  '--no-dev',        // Modo de produção para melhor estabilidade
  '--minify',        // Minificar o bundle
  '--web'            // Iniciar no modo web
];

console.log(`Comando: npx ${args.join(' ')}`);

// Iniciar o processo do Expo
const expoProcess = spawn('npx', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_METRO_CACHE: 'false',
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