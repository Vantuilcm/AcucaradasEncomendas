#!/usr/bin/env node

/**
 * 🔍 Script de Validação Pré-Build
 * Verifica todas as configurações de segurança antes de builds de produção
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
  log('\n🔍 Verificando Variáveis de Ambiente...', 'cyan');
  
  const requiredVars = [
    'JWT_SECRET',
    'FIREBASE_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_AUTH_DOMAIN'
  ];
  
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
      log(`❌ ${varName} não configurada`, 'red');
    } else {
      log(`✅ ${varName} configurada`, 'green');
    }
  });
  
  // Verificar JWT_SECRET strength
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      log('⚠️ JWT_SECRET deve ter pelo menos 32 caracteres', 'yellow');
    }
    if (process.env.JWT_SECRET.includes('chave_secreta') || 
        process.env.JWT_SECRET.includes('desenvolvimento')) {
      log('❌ JWT_SECRET contém valores inseguros de desenvolvimento', 'red');
      missingVars.push('JWT_SECRET (inseguro)');
    }
  }
  
  return missingVars;
}

function checkSensitiveFiles() {
  log('\n🔍 Verificando Arquivos Sensíveis...', 'cyan');
  
  const sensitiveFiles = [
    'google-service-account.json',
    'functions/.runtimeconfig.json',
    '.env.production',
    '.env.local'
  ];
  
  const foundSensitiveFiles = [];
  
  sensitiveFiles.forEach(file => {
    if (fs.existsSync(file)) {
      foundSensitiveFiles.push(file);
      log(`⚠️ Arquivo sensível encontrado: ${file}`, 'yellow');
    } else {
      log(`✅ ${file} não encontrado (correto)`, 'green');
    }
  });
  
  return foundSensitiveFiles;
}

function checkFirebaseConsistency() {
  log('\n🔍 Verificando Consistência Firebase...', 'cyan');
  
  const errors = [];
  
  try {
    // Verificar Android
    const androidConfig = JSON.parse(
      fs.readFileSync('android/app/google-services.prod.json', 'utf8')
    );
    const androidProjectId = androidConfig.project_info.project_id;
    
    // Verificar iOS
    const iosConfig = fs.readFileSync('ios/GoogleService-Info.prod.plist', 'utf8');
    const iosProjectIdMatch = iosConfig.match(/<key>PROJECT_ID<\/key>\s*<string>([^<]+)<\/string>/);
    const iosProjectId = iosProjectIdMatch ? iosProjectIdMatch[1] : null;
    
    if (androidProjectId && iosProjectId) {
      if (androidProjectId === iosProjectId) {
        log(`✅ Project IDs consistentes: ${androidProjectId}`, 'green');
      } else {
        const error = `Project IDs inconsistentes: Android(${androidProjectId}) vs iOS(${iosProjectId})`;
        log(`❌ ${error}`, 'red');
        errors.push(error);
      }
    } else {
      const error = 'Não foi possível verificar Project IDs';
      log(`❌ ${error}`, 'red');
      errors.push(error);
    }
    
  } catch (error) {
    const errorMsg = `Erro ao verificar configurações Firebase: ${error.message}`;
    log(`❌ ${errorMsg}`, 'red');
    errors.push(errorMsg);
  }
  
  return errors;
}

function checkEASSecrets() {
  log('\n🔍 Verificando EAS Secrets...', 'cyan');
  
  try {
    const output = execSync('eas secret:list', { encoding: 'utf8' });
    
    const requiredSecrets = [
      'JWT_SECRET',
      'FIREBASE_API_KEY',
      'FIREBASE_PROJECT_ID'
    ];
    
    const missingSecrets = [];
    
    requiredSecrets.forEach(secret => {
      if (output.includes(secret)) {
        log(`✅ EAS Secret ${secret} configurada`, 'green');
      } else {
        log(`❌ EAS Secret ${secret} não encontrada`, 'red');
        missingSecrets.push(secret);
      }
    });
    
    return missingSecrets;
    
  } catch (error) {
    log('⚠️ Não foi possível verificar EAS Secrets (talvez não esteja logado)', 'yellow');
    return [];
  }
}

function checkGitIgnore() {
  log('\n🔍 Verificando .gitignore...', 'cyan');
  
  const errors = [];
  
  try {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    
    const requiredPatterns = [
      '.env.local',
      '.env.production',
      'google-service-account*.json',
      '.runtimeconfig.json'
    ];
    
    requiredPatterns.forEach(pattern => {
      if (gitignore.includes(pattern)) {
        log(`✅ .gitignore inclui: ${pattern}`, 'green');
      } else {
        log(`❌ .gitignore não inclui: ${pattern}`, 'red');
        errors.push(`Padrão ausente no .gitignore: ${pattern}`);
      }
    });
    
  } catch (error) {
    const errorMsg = 'Erro ao verificar .gitignore';
    log(`❌ ${errorMsg}`, 'red');
    errors.push(errorMsg);
  }
  
  return errors;
}

function main() {
  log('🔐 Iniciando Validação Pré-Build de Segurança', 'magenta');
  log('=' .repeat(50), 'magenta');
  
  const missingVars = checkEnvironmentVariables();
  const sensitiveFiles = checkSensitiveFiles();
  const firebaseErrors = checkFirebaseConsistency();
  const missingSecrets = checkEASSecrets();
  const gitignoreErrors = checkGitIgnore();
  
  log('\n' + '=' .repeat(50), 'magenta');
  log('📋 RESUMO DA VALIDAÇÃO', 'magenta');
  
  const allErrors = [
    ...missingVars.map(v => `Variável de ambiente ausente: ${v}`),
    ...sensitiveFiles.map(f => `Arquivo sensível presente: ${f}`),
    ...firebaseErrors,
    ...missingSecrets.map(s => `EAS Secret ausente: ${s}`),
    ...gitignoreErrors
  ];
  
  if (allErrors.length === 0) {
    log('\n✅ TODAS AS VERIFICAÇÕES PASSARAM!', 'green');
    log('🚀 Build de produção APROVADO', 'green');
    process.exit(0);
  } else {
    log('\n❌ ERROS ENCONTRADOS:', 'red');
    allErrors.forEach(error => {
      log(`  • ${error}`, 'red');
    });
    
    log('\n🚫 Build de produção NÃO RECOMENDADO', 'red');
    log('🔧 Corrija os erros acima antes de continuar', 'yellow');
    
    log('\n📚 Consulte o SECURITY_SETUP.md para instruções', 'cyan');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  checkSensitiveFiles,
  checkFirebaseConsistency,
  checkEASSecrets,
  checkGitIgnore
};