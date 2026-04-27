const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Script para iniciar o Expo de forma segura, evitando conflitos de porta
 * e limpando o cache se necessário.
 */

const DEFAULT_PORT = 8082; // Usando 8082 para evitar o 8081 que costuma estar ocupado

function isPortInUse(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    return output.includes('LISTENING');
  } catch (e) {
    return false;
  }
}

async function start() {
  console.log('🚀 Iniciando Expo de forma segura...');

  let port = DEFAULT_PORT;
  while (isPortInUse(port)) {
    console.log(`⚠️ Porta ${port} em uso, tentando ${port + 1}...`);
    port++;
  }

  console.log(`✅ Usando porta ${port}`);

  // Limpar cache se solicitado
  const clearCache = process.argv.includes('--clear');
  if (clearCache) {
    console.log('🧹 Limpando cache do Metro Bundler...');
  }

  const args = ['expo', 'start', '--port', port.toString()];
  if (clearCache) args.push('--clear');
  if (process.argv.includes('--web')) args.push('--web');

  console.log(`\n> npx ${args.join(' ')}\n`);

  const expoProcess = spawn('npx.cmd', args, {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..')
  });

  expoProcess.on('error', (err) => {
    console.error('❌ Erro ao iniciar o Expo:', err);
  });

  expoProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`\n💡 Dica: Se o erro for "EADDRINUSE", tente rodar novamente.`);
    }
  });
}

start();
