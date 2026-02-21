#!/usr/bin/env node

/**
 * Script de inicialização personalizado para o app Açucaradas Encomendas
 * Contorna problemas do Expo CLI e inicia o servidor de desenvolvimento
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Iniciando Açucaradas Encomendas...');
console.log('📱 Aplicativo de encomendas de doces artesanais');
console.log('');

// Verificar se as dependências estão instaladas
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ Dependências não encontradas. Execute: npm install');
  process.exit(1);
}

// Verificar se o arquivo de configuração existe
const appConfigPath = path.join(__dirname, 'app.config.ts');
if (!fs.existsSync(appConfigPath)) {
  console.error('❌ Arquivo app.config.ts não encontrado');
  process.exit(1);
}

console.log('✅ Dependências verificadas');
console.log('✅ Configuração verificada');
console.log('');

// Tentar diferentes métodos de inicialização
const startMethods = [
  {
    name: 'Expo CLI Local',
    command: 'npx',
    args: ['expo', 'start', '--clear', '--dev-client']
  },
  {
    name: 'Expo CLI Global',
    command: 'expo',
    args: ['start', '--clear', '--dev-client']
  },
  {
    name: 'Metro Bundler',
    command: 'npx',
    args: ['react-native', 'start', '--reset-cache']
  }
];

let currentMethodIndex = 0;

function tryStartMethod(methodIndex) {
  if (methodIndex >= startMethods.length) {
    console.error('❌ Todos os métodos de inicialização falharam');
    console.log('');
    console.log('🔧 Soluções recomendadas:');
    console.log('1. Execute: npm install --legacy-peer-deps');
    console.log('2. Execute: npm install -g @expo/cli');
    console.log('3. Verifique se o Node.js está atualizado');
    console.log('4. Limpe o cache: npm cache clean --force');
    process.exit(1);
  }

  const method = startMethods[methodIndex];
  console.log(`🔄 Tentando método ${methodIndex + 1}: ${method.name}`);
  
  const child = spawn(method.command, method.args, {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  child.on('error', (error) => {
    console.error(`❌ Erro no método ${method.name}:`, error.message);
    console.log('');
    tryStartMethod(methodIndex + 1);
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log(`✅ ${method.name} executado com sucesso`);
    } else {
      console.error(`❌ ${method.name} falhou com código ${code}`);
      console.log('');
      tryStartMethod(methodIndex + 1);
    }
  });

  // Timeout de 30 segundos para cada método
  setTimeout(() => {
    if (!child.killed) {
      console.log(`⏰ Timeout para ${method.name}, tentando próximo método...`);
      child.kill();
      tryStartMethod(methodIndex + 1);
    }
  }, 30000);
}

// Iniciar o processo
tryStartMethod(0);

// Capturar sinais de interrupção
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando servidor de desenvolvimento...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Encerrando servidor de desenvolvimento...');
  process.exit(0);
});