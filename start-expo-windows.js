const { spawn } = require('child_process');
const path = require('path');

// Configurações específicas para Windows - resolver problemas de file watcher
process.env.CHOKIDAR_USEPOLLING = 'true';
process.env.CHOKIDAR_INTERVAL = '2000';
process.env.WATCHMAN_DISABLE_RECRAWL = 'true';
process.env.EXPO_NO_WATCHMAN = 'true';
process.env.METRO_NO_WATCHMAN = 'true';
process.env.CI = 'false';
process.env.FORCE_COLOR = '1';
process.env.NODE_ENV = 'development';

// Configurações adicionais para Metro
process.env.METRO_CACHE = 'false';
process.env.METRO_RESET_CACHE = 'true';
process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS = '0.0.0.0';

console.log('🚀 Iniciando Expo com configurações otimizadas para Windows...');
console.log('📁 Diretório:', __dirname);
console.log('🔧 Variáveis de ambiente configuradas:');
console.log('   - CHOKIDAR_USEPOLLING:', process.env.CHOKIDAR_USEPOLLING);
console.log('   - EXPO_NO_WATCHMAN:', process.env.EXPO_NO_WATCHMAN);
console.log('   - METRO_NO_WATCHMAN:', process.env.METRO_NO_WATCHMAN);
console.log('');

// Limpar cache antes de iniciar
console.log('🧹 Limpando cache do Metro...');
const clearCache = spawn('npx', ['expo', 'start', '--clear', '--no-dev', '--minify'], {
  stdio: 'pipe',
  shell: true,
  cwd: __dirname,
  env: process.env
});

clearCache.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // Verificar se o servidor iniciou com sucesso
  if (output.includes('Metro waiting') || output.includes('Expo DevTools') || output.includes('localhost')) {
    console.log('✅ Servidor Expo iniciado com sucesso!');
  }
  
  // Verificar se há erros de file watcher
  if (output.includes('Failed to start watch mode') || output.includes('Watcher.js')) {
    console.log('❌ Erro de file watcher detectado!');
    console.log('💡 Tentando reiniciar com configurações alternativas...');
  }
});

clearCache.stderr.on('data', (data) => {
  const error = data.toString();
  console.error('⚠️ Aviso/Erro:', error);
});

clearCache.on('close', (code) => {
  console.log(`\n📊 Processo finalizado com código: ${code}`);
  if (code !== 0) {
    console.log('🔄 Tentando iniciar sem cache...');
    
    // Tentar sem cache
    const fallback = spawn('npx', ['expo', 'start', '--web', '--port', '8082'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname,
      env: process.env
    });
    
    fallback.on('close', (fallbackCode) => {
      console.log(`\n📊 Processo fallback finalizado com código: ${fallbackCode}`);
    });
  }
});

clearCache.on('error', (err) => {
  console.error('❌ Erro ao executar comando:', err.message);
  console.log('🔄 Tentando método alternativo...');
  
  // Método alternativo
  const alternative = spawn('npx', ['expo', 'start', '--web'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname,
    env: process.env
  });
});

// Capturar sinais de interrupção
process.on('SIGINT', () => {
  console.log('\n🛑 Parando servidor Expo...');
  clearCache.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Finalizando servidor Expo...');
  clearCache.kill('SIGTERM');
  process.exit(0);
});