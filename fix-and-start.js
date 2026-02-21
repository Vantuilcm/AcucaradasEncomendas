#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔧 Açucaradas Encomendas - Script de Correção e Inicialização');
console.log('=' .repeat(60));

// Função para executar comandos
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Executando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('error', (error) => {
      console.error(`❌ Erro ao executar ${command}:`, error.message);
      reject(error);
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${command} executado com sucesso`);
        resolve(code);
      } else {
        console.error(`❌ ${command} falhou com código ${code}`);
        reject(new Error(`Comando falhou com código ${code}`));
      }
    });
  });
}

// Função principal
async function main() {
  try {
    console.log('📋 Verificando configurações...');
    
    // 1. Verificar se o package.json está correto
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.main !== 'expo-router/entry') {
        console.log('🔧 Corrigindo package.json...');
        packageJson.main = 'expo-router/entry';
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('✅ package.json corrigido');
      }
    }
    
    // 2. Verificar se há App.tsx conflitante na raiz
    const appTsxPath = path.join(__dirname, 'App.tsx');
    if (fs.existsSync(appTsxPath)) {
      console.log('🔧 Removendo App.tsx conflitante da raiz...');
      fs.renameSync(appTsxPath, path.join(__dirname, 'App.tsx.backup'));
      console.log('✅ App.tsx movido para backup');
    }
    
    // 3. Verificar se há app.config.js conflitante
    const appConfigPath = path.join(__dirname, 'app.config.js');
    if (fs.existsSync(appConfigPath)) {
      console.log('🔧 Removendo app.config.js conflitante...');
      fs.unlinkSync(appConfigPath);
      console.log('✅ app.config.js removido');
    }
    
    // 4. Limpar cache
    console.log('🧹 Limpando cache...');
    try {
      await runCommand('npx', ['expo', 'install', '--fix']);
    } catch (error) {
      console.log('⚠️ Erro ao executar expo install --fix, continuando...');
    }
    
    // 5. Reinstalar dependências críticas
    console.log('📦 Reinstalando dependências críticas...');
    try {
      await runCommand('pnpm', ['install', 'expo-router@latest', '@expo/metro-config@latest']);
    } catch (error) {
      console.log('⚠️ Erro ao reinstalar dependências, tentando npm...');
      try {
        await runCommand('npm', ['install', 'expo-router@latest', '@expo/metro-config@latest']);
      } catch (npmError) {
        console.log('⚠️ Erro com npm também, continuando...');
      }
    }
    
    // 6. Iniciar o servidor
    console.log('🚀 Iniciando servidor de desenvolvimento...');
    console.log('🌐 O aplicativo estará disponível em: http://localhost:8082');
    console.log('📱 Use Ctrl+C para parar o servidor');
    console.log('=' .repeat(60));
    
    // Tentar diferentes métodos de inicialização
    const startMethods = [
      ['npx', ['expo', 'start', '--web', '--port', '8082']],
      ['npx', ['expo', 'start', '--web', '--port', '8083']],
      ['npm', ['run', 'web']],
      ['pnpm', ['run', 'web']]
    ];
    
    for (const [command, args] of startMethods) {
      try {
        console.log(`🔄 Tentando: ${command} ${args.join(' ')}`);
        await runCommand(command, args);
        break; // Se chegou aqui, deu certo
      } catch (error) {
        console.log(`⚠️ Método ${command} falhou, tentando próximo...`);
        continue;
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante a execução:', error.message);
    console.log('\n📋 Diagnóstico:');
    console.log('1. Verifique se o Node.js está instalado (versão 18+)');
    console.log('2. Verifique se o pnpm ou npm está funcionando');
    console.log('3. Tente executar: pnpm install');
    console.log('4. Tente executar: npx expo install --fix');
    console.log('5. Se nada funcionar, tente: npm create expo-app@latest');
    process.exit(1);
  }
}

// Executar
main().catch(console.error);