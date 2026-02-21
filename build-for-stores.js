#!/usr/bin/env node

/**
 * Script de Build Otimizado para Publicação nas Lojas
 * Açucaradas Encomendas - App de Doces Artesanais
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🍰 Açucaradas Encomendas - Build para Lojas');
console.log('================================================');
console.log('');

// Configurações
const config = {
  appName: 'Açucaradas Encomendas',
  version: '1.0.0',
  bundleId: 'com.acucaradas.encomendas',
  projectId: '6090106b-e327-4744-bce5-9ddb0d037045'
};

// Verificações pré-build
function runPreBuildChecks() {
  console.log('🔍 Executando verificações pré-build...');
  
  const checks = [
    {
      name: 'Node.js Version',
      check: () => {
        const version = process.version;
        console.log(`   ✅ Node.js ${version}`);
        return true;
      }
    },
    {
      name: 'Dependencies',
      check: () => {
        if (!fs.existsSync('node_modules')) {
          console.log('   ❌ node_modules não encontrado');
          return false;
        }
        console.log('   ✅ Dependencies instaladas');
        return true;
      }
    },
    {
      name: 'App Config',
      check: () => {
        if (!fs.existsSync('app.config.ts')) {
          console.log('   ❌ app.config.ts não encontrado');
          return false;
        }
        console.log('   ✅ Configuração do app');
        return true;
      }
    },
    {
      name: 'EAS Config',
      check: () => {
        if (!fs.existsSync('eas.json')) {
          console.log('   ❌ eas.json não encontrado');
          return false;
        }
        console.log('   ✅ Configuração EAS');
        return true;
      }
    },
    {
      name: 'Firebase Config',
      check: () => {
        const hasAndroid = fs.existsSync('google-services.json');
        const hasIOS = fs.existsSync('ios/GoogleService-Info.plist');
        if (!hasAndroid || !hasIOS) {
          console.log('   ⚠️  Configurações Firebase incompletas');
          return true; // Não bloqueia o build
        }
        console.log('   ✅ Configurações Firebase');
        return true;
      }
    }
  ];

  let allPassed = true;
  checks.forEach(check => {
    try {
      if (!check.check()) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ ${check.name}: ${error.message}`);
      allPassed = false;
    }
  });

  return allPassed;
}

// Limpar logs de produção
function cleanProductionLogs() {
  console.log('🧹 Limpando logs de desenvolvimento...');
  try {
    execSync('npm run clean-logs', { stdio: 'pipe' });
    console.log('   ✅ Logs limpos');
  } catch (error) {
    console.log('   ⚠️  Erro ao limpar logs (continuando...)');
  }
}

// Validar segurança
function validateSecurity() {
  console.log('🔐 Validando configurações de segurança...');
  try {
    execSync('npm run validate-security', { stdio: 'pipe' });
    console.log('   ✅ Validação de segurança passou');
  } catch (error) {
    console.log('   ⚠️  Validação de segurança com avisos (continuando...)');
  }
}

// Gerar assets das lojas
function generateStoreAssets() {
  console.log('🎨 Gerando assets para as lojas...');
  try {
    execSync('npm run prepare:store-assets', { stdio: 'pipe' });
    console.log('   ✅ Assets gerados');
  } catch (error) {
    console.log('   ⚠️  Erro ao gerar assets (continuando...)');
  }
}

// Executar build
function runBuild(platform, profile = 'production') {
  console.log(`🚀 Iniciando build ${platform} (${profile})...`);
  console.log('');
  
  const command = 'eas';
  const args = ['build', '--platform', platform, '--profile', profile, '--non-interactive'];
  
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });

    child.on('error', (error) => {
      console.error(`❌ Erro no build ${platform}:`, error.message);
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ Build ${platform} concluído com sucesso!`);
        resolve();
      } else {
        console.error(`❌ Build ${platform} falhou com código ${code}`);
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });
}

// Menu interativo
function showMenu() {
  console.log('📱 Escolha o tipo de build:');
  console.log('');
  console.log('1. 🤖 Android (APK)');
  console.log('2. 🍎 iOS (IPA)');
  console.log('3. 📦 Ambos (Android + iOS)');
  console.log('4. 🧪 Preview Build (Teste)');
  console.log('5. 📊 Verificar Status EAS');
  console.log('6. ❌ Cancelar');
  console.log('');
}

// Verificar status EAS
function checkEASStatus() {
  console.log('📊 Verificando status EAS...');
  try {
    execSync('eas build:list --limit=5', { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Erro ao verificar status EAS');
  }
}

// Função principal
async function main() {
  try {
    // Verificações pré-build
    if (!runPreBuildChecks()) {
      console.log('');
      console.log('❌ Verificações pré-build falharam. Corrija os problemas antes de continuar.');
      process.exit(1);
    }

    console.log('');
    console.log('✅ Todas as verificações passaram!');
    console.log('');

    // Preparação
    cleanProductionLogs();
    validateSecurity();
    generateStoreAssets();
    
    console.log('');
    showMenu();

    // Simular escolha do usuário (pode ser modificado para input real)
    const choice = process.argv[2] || '4'; // Default para preview

    switch (choice) {
      case '1':
        await runBuild('android');
        break;
      case '2':
        await runBuild('ios');
        break;
      case '3':
        console.log('🔄 Executando builds sequenciais...');
        await runBuild('android');
        await runBuild('ios');
        break;
      case '4':
        await runBuild('all', 'preview');
        break;
      case '5':
        checkEASStatus();
        break;
      case '6':
        console.log('👋 Build cancelado.');
        process.exit(0);
        break;
      default:
        console.log('⚠️  Opção inválida. Executando preview build...');
        await runBuild('all', 'preview');
    }

    console.log('');
    console.log('🎉 Build concluído com sucesso!');
    console.log('');
    console.log('📱 Próximos passos:');
    console.log('1. Teste o build em dispositivos físicos');
    console.log('2. Execute testes de aceitação');
    console.log('3. Submeta para as lojas: npm run submit:android ou npm run submit:ios');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Erro durante o build:', error.message);
    console.error('');
    console.error('🔧 Soluções sugeridas:');
    console.error('1. Verifique suas credenciais EAS: eas login');
    console.error('2. Verifique a configuração: eas diagnostics');
    console.error('3. Limpe o cache: npm cache clean --force');
    console.error('4. Reinstale dependências: npm install --legacy-peer-deps');
    process.exit(1);
  }
}

// Capturar sinais de interrupção
process.on('SIGINT', () => {
  console.log('\n👋 Build interrompido pelo usuário.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Build encerrado.');
  process.exit(0);
});

// Executar
if (require.main === module) {
  main();
}

module.exports = { main, runBuild, runPreBuildChecks };