#!/usr/bin/env node

console.log('🚀 Iniciando servidor de desenvolvimento...');
console.log('📁 Diretório atual:', process.cwd());
console.log('📦 Node.js versão:', process.version);

try {
  const { spawn } = require('child_process');
  
  console.log('🔧 Executando: npx expo start --web --port 8082');
  
  const child = spawn('npx', ['expo', 'start', '--web', '--port', '8082'], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    console.error('❌ Erro ao iniciar o processo:', error);
  });
  
  child.on('exit', (code) => {
    console.log(`🏁 Processo finalizado com código: ${code}`);
  });
  
} catch (error) {
  console.error('❌ Erro:', error);
  process.exit(1);
}