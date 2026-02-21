#!/usr/bin/env node

// Script para iniciar o Expo com configurações otimizadas para Windows
// Resolve problemas de file watcher e Metro bundler

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando Expo com configurações otimizadas para Windows...');

// Configurar variáveis de ambiente para resolver problemas de file watching
process.env.CHOKIDAR_USEPOLLING = 'true';
process.env.CHOKIDAR_INTERVAL = '1000';
process.env.WATCHMAN_DISABLE_RECRAWL = 'true';
process.env.EXPO_NO_WATCHMAN = 'true';
process.env.METRO_NO_WATCHMAN = '1';

// Iniciar o processo do Expo
const expoProcess = spawn('npx', ['expo', 'start', '--web', '--port', '8081'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
  env: process.env
});

expoProcess.on('error', (error) => {
  console.error('❌ Erro ao iniciar o Expo:', error.message);
  process.exit(1);
});

expoProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Expo saiu com código ${code}`);
  } else {
    console.log('✅ Expo encerrado com sucesso');
  }
  process.exit(code);
});

// Capturar sinais para encerramento limpo
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando Expo...');
  expoProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando Expo...');
  expoProcess.kill('SIGTERM');
});