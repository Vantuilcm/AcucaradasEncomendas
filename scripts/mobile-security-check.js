#!/usr/bin/env node

/**
 * Script para verificar a segurança da aplicação mobile
 * 
 * Este script analisa a configuração da aplicação mobile para garantir que
 * todas as medidas de segurança recomendadas estão implementadas.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Cores para saída
const colors = {
  error: chalk.bold.red,
  warning: chalk.keyword('orange'),
  info: chalk.blue,
  success: chalk.green,
  highlight: chalk.yellow,
};

// Verificações de segurança para aplicações mobile
const securityChecks = [
  {
    name: 'Armazenamento Seguro',
    description: 'Uso de mecanismos seguros para armazenamento de dados sensíveis',
    pattern: /EncryptedSharedPreferences|SecureStorage|Keychain|EncryptedStorage/i,
    required: true,
    recommendation: 'Implementar armazenamento seguro para dados sensíveis usando EncryptedSharedPreferences (Android) ou Keychain (iOS)',
    files: ['src/utils/mobile-security.js', 'src/utils/storage.js'],
  },
  {
    name: 'Verificação de Permissões',
    description: 'Verificação adequada de permissões do dispositivo',
    pattern: /checkPermissions|requestPermissions|hasPermission|askPermission/i,
    required: true,
    recommendation: 'Implementar verificação e solicitação adequada de permissões',
    files: ['src/utils/mobile-security.js', 'src/screens/**/*.js'],
  },
  {
    name: 'Detecção de Root/Jailbreak',
    description: 'Detecção de dispositivos com root/jailbreak',
    pattern: /isDeviceRooted|isJailBroken|detectDeviceCompromise/i,
    required: false,
    recommendation: 'Implementar detecção de dispositivos comprometidos (root/jailbreak)',
    files: ['src/utils/mobile-security.js'],
  },
  {
    name: 'Prevenção de Captura de Tela',
    description: 'Prevenção de captura de tela em telas sensíveis',
    pattern: /preventScreenCapture|FLAG_SECURE|setFlagSecure|allowScreenCapture/i,
    required: false,
    recommendation: 'Implementar prevenção de captura de tela em telas com dados sensíveis',
    files: ['src/utils/mobile-security.js', 'src/screens/**/*.js'],
  },
  {
    name: 'Proteção de Dados em Trânsito',
    description: 'Uso de HTTPS para todas as comunicações',
    pattern: /https:\/\/|SSL|TLS|certificate/i,
    required: true,
    recommendation: 'Garantir que todas as comunicações usem HTTPS',
    files: ['src/services/**/*.js', 'src/api/**/*.js'],
  },
  {
    name: 'Validação de Certificados',
    description: 'Validação adequada de certificados SSL/TLS',
    pattern: /certificatePinning|SSL_pinning|validateCertificate|checkServerTrust/i,
    required: false,
    recommendation: 'Implementar certificate pinning para prevenir ataques MITM',
    files: ['src/utils/mobile-security.js', 'src/services/**/*.js'],
  },
  {
    name: 'Proteção contra Engenharia Reversa',
    description: 'Medidas para dificultar engenharia reversa',
    pattern: /obfuscate|proguard|obfuscation|anti-tampering/i,
    required: false,
    recommendation: 'Implementar ofuscação de código e detecção de adulteração',
    files: ['android/app/build.gradle', 'ios/Podfile', 'app.json'],
  },
];

/**
 * Verifica a segurança da aplicação mobile
 */
async function checkMobileSecurity() {
  console.log(colors.highlight('\n=== VERIFICAÇÃO DE SEGURANÇA MOBILE ===\n'));
  
  // Resultados das verificações
  const results = {
    date: new Date().toISOString(),
    checks: [],
    summary: {
      total: securityChecks.length,
      passed: 0,
      failed: 0,
      warning: 0,
    },
  };
  
  // Executar verificações
  for (const check of securityChecks) {
    console.log(colors.highlight(`\n=== Verificando: ${check.name} ===`));
    
    let passed = false;
    let fileContents = '';
    
    // Verificar em todos os arquivos especificados
    for (const filePattern of check.files) {
      const isDirectory = filePattern.includes('**');
      
      if (isDirectory) {
        // Padrão de diretório, verificar todos os arquivos correspondentes
        const baseDir = filePattern.split('/**')[0];
        if (fs.existsSync(baseDir)) {
          try {
            const files = findFilesRecursively(baseDir, filePattern.endsWith('.js') ? '.js' : '');
            for (const file of files) {
              const content = fs.readFileSync(file, 'utf8');
              fileContents += content;
              if (check.pattern.test(content)) {
                passed = true;
                console.log(colors.info(`  Encontrado em: ${path.relative('.', file)}`));
              }
            }
          } catch (error) {
            console.error(colors.error(`  Erro ao ler diretório ${baseDir}: ${error.message}`));
          }
        }
      } else {
        // Arquivo específico
        const filePath = path.resolve(filePattern);
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            fileContents += content;
            if (check.pattern.test(content)) {
              passed = true;
              console.log(colors.info(`  Encontrado em: ${filePattern}`));
            }
          } catch (error) {
            console.error(colors.error(`  Erro ao ler ${filePath}: ${error.message}`));
          }
        }
      }
    }
    
    if (passed) {
      console.log(colors.success(`✅ ${check.name}: Implementado`));
      results.checks.push({
        name: check.name,
        status: 'passed',
        description: check.description,
      });
      results.summary.passed++;
    } else if (check.required) {
      console.log(colors.error(`❌ ${check.name}: Não implementado (Obrigatório)`));
      console.log(colors.info(`   Recomendação: ${check.recommendation}`));
      results.checks.push({
        name: check.name,
        status: 'failed',
        description: check.description,
        recommendation: check.recommendation,
      });
      results.summary.failed++;
    } else {
      console.log(colors.warning(`⚠️ ${check.name}: Não implementado (Recomendado)`));
      console.log(colors.info(`   Recomendação: ${check.recommendation}`));
      results.checks.push({
        name: check.name,
        status: 'warning',
        description: check.description,
        recommendation: check.recommendation,
      });
      results.summary.warning++;
    }
  }
  
  // Exibir resumo
  console.log(colors.highlight('\n=== RESUMO DA VERIFICAÇÃO ===\n'));
  console.log(`Total: ${results.summary.total}`);
  console.log(colors.success(`Passaram: ${results.summary.passed}`));
  console.log(colors.error(`Falharam: ${results.summary.failed}`));
  console.log(colors.warning(`Avisos: ${results.summary.warning}`));
  
  // Verificar se todas as verificações obrigatórias passaram
  if (results.summary.failed === 0) {
    console.log(colors.success('\n✅ Todas as verificações obrigatórias passaram!\n'));
    return true;
  } else {
    console.error(colors.error('\n❌ Algumas verificações obrigatórias falharam!\n'));
    return false;
  }
}

/**
 * Encontra arquivos recursivamente em um diretório
 * @param {string} dir - Diretório base
 * @param {string} extension - Extensão de arquivo a ser filtrada
 * @returns {string[]} - Lista de caminhos de arquivos
 */
function findFilesRecursively(dir, extension) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Recursivamente buscar em subdiretórios
      results = results.concat(findFilesRecursively(filePath, extension));
    } else {
      // Verificar extensão se especificada
      if (!extension || filePath.endsWith(extension)) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Executar verificação
checkMobileSecurity().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(colors.error(`Erro fatal: ${error.message}`));
  process.exit(1);
});