#!/usr/bin/env node

/**
 * Script de Validação de Segurança
 * Executa verificações críticas antes do build de produção
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ERRORS = [];
const WARNINGS = [];

function addError(message) {
  ERRORS.push(`❌ ERRO: ${message}`);
}

function addWarning(message) {
  WARNINGS.push(`⚠️  AVISO: ${message}`);
}

function checkEnvironmentVariables() {
  console.log('🔍 Verificando variáveis de ambiente...');
  
  const requiredVars = [
    'JWT_SECRET',
    'FIREBASE_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_AUTH_DOMAIN'
  ];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      addError(`Variável de ambiente ${varName} não configurada`);
    }
  });
  
  // Verificar se JWT_SECRET é seguro
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      addError('JWT_SECRET deve ter pelo menos 32 caracteres');
    }
    if (process.env.JWT_SECRET === 'chave_secreta') {
      addError('JWT_SECRET não pode usar o valor padrão inseguro');
    }
  }
}

function checkSensitiveFiles() {
  console.log('🔍 Verificando arquivos sensíveis...');
  
  const sensitiveFiles = [
    'google-service-account.json',
    'functions/.runtimeconfig.json',
    '.env.production',
    '.env.local'
  ];
  
  sensitiveFiles.forEach(file => {
    if (fs.existsSync(file)) {
      addWarning(`Arquivo sensível encontrado: ${file} - Certifique-se de que não está no controle de versão`);
    }
  });
}

function checkCodeForSecrets() {
  console.log('🔍 Verificando código por secrets expostos...');
  
  try {
    // Verificar por chaves hardcoded
    const result = execSync('grep -r "chave_secreta" src/ || true', { encoding: 'utf8' });
    if (result.trim()) {
      addError('Encontradas referências a "chave_secreta" no código');
      console.log(result);
    }
    
    // Verificar por API keys expostas
    const apiKeyResult = execSync('grep -r "AIza[0-9A-Za-z_-]{35}" src/ || true', { encoding: 'utf8' });
    if (apiKeyResult.trim()) {
      addError('Encontradas possíveis API keys do Firebase expostas no código');
      console.log(apiKeyResult);
    }
  } catch (error) {
    addWarning('Não foi possível executar verificação de grep (normal no Windows)');
  }
}

function checkFirebaseConfig() {
  console.log('🔍 Verificando configuração Firebase...');
  
  const androidConfig = 'google-services.json';
  const iosConfig = 'ios/GoogleService-Info.plist';
  
  if (fs.existsSync(androidConfig) && fs.existsSync(iosConfig)) {
    try {
      const androidData = JSON.parse(fs.readFileSync(androidConfig, 'utf8'));
      const iosData = fs.readFileSync(iosConfig, 'utf8');
      
      const androidProjectId = androidData.project_info.project_id;
      const iosProjectIdMatch = iosData.match(/<key>PROJECT_ID<\/key>\s*<string>([^<]+)<\/string>/);
      
      if (iosProjectIdMatch && androidProjectId !== iosProjectIdMatch[1]) {
        addError(`Project IDs inconsistentes: Android(${androidProjectId}) vs iOS(${iosProjectIdMatch[1]})`);
      }
    } catch (error) {
      addWarning('Erro ao verificar configurações Firebase: ' + error.message);
    }
  }
}

function checkBuildConfig() {
  console.log('🔍 Verificando configuração de build...');
  
  if (fs.existsSync('eas.json')) {
    try {
      const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
      
      // Verificar se há placeholders
      const configStr = JSON.stringify(easConfig);
      if (configStr.includes('seu-apple-id@exemplo.com')) {
        addError('eas.json contém placeholders não configurados');
      }
      
      if (configStr.includes('./google-service-account.json')) {
        addError('eas.json referencia arquivo de service account local (use EAS Secrets)');
      }
    } catch (error) {
      addWarning('Erro ao verificar eas.json: ' + error.message);
    }
  }
}

function checkGitignore() {
  console.log('🔍 Verificando .gitignore...');
  
  if (fs.existsSync('.gitignore')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    
    const requiredPatterns = [
      '.env.production',
      '*.p12',
      'google-service-account*.json',
      '.runtimeconfig.json'
    ];
    
    requiredPatterns.forEach(pattern => {
      if (!gitignore.includes(pattern)) {
        addWarning(`Padrão ${pattern} não encontrado no .gitignore`);
      }
    });
  }
}

function main() {
  console.log('🔐 Iniciando validação de segurança...\n');
  
  checkEnvironmentVariables();
  checkSensitiveFiles();
  checkCodeForSecrets();
  checkFirebaseConfig();
  checkBuildConfig();
  checkGitignore();
  
  console.log('\n📊 Resultado da validação:');
  
  if (WARNINGS.length > 0) {
    console.log('\n⚠️  AVISOS:');
    WARNINGS.forEach(warning => console.log(warning));
  }
  
  if (ERRORS.length > 0) {
    console.log('\n❌ ERROS CRÍTICOS:');
    ERRORS.forEach(error => console.log(error));
    console.log('\n🚫 Build de produção NÃO RECOMENDADO até resolver os erros acima.');
    process.exit(1);
  } else {
    console.log('\n✅ Validação de segurança passou! Build de produção pode prosseguir.');
    if (WARNINGS.length > 0) {
      console.log('\n💡 Considere resolver os avisos acima para melhor segurança.');
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };