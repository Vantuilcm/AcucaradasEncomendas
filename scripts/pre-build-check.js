#!/usr/bin/env node

/**
 * Script de Verificação Pré-Build
 * Verifica se todas as configurações necessárias estão prontas para build e publicação
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n🔍 ${title}`, 'cyan');
  log('='.repeat(50), 'gray');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Variáveis obrigatórias para build
const REQUIRED_ENV_VARS = {
  security: [
    'JWT_SECRET'
  ],
  firebase: [
    'FIREBASE_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID'
  ],
  apple: [
    'APPLE_ID',
    'ASC_APP_ID',
    'APPLE_TEAM_ID'
  ],
  google: [
    'GOOGLE_SERVICE_ACCOUNT_KEY_PATH'
  ]
};

// Arquivos obrigatórios
const REQUIRED_FILES = [
  'app.json',
  'eas.json',
  'package.json',
  'expo-env.d.ts'
];

// Scripts obrigatórios no package.json
const REQUIRED_SCRIPTS = [
  'build:android',
  'build:ios',
  'submit:android',
  'submit:ios',
  'validate-security',
  'pre-build-check'
];

let hasErrors = false;
let hasWarnings = false;

async function checkEASSecrets() {
  logSection('VERIFICANDO SECRETS DO EAS');
  
  try {
    const output = execSync('eas env:list --environment production --non-interactive', { encoding: 'utf8' });
    const secretNames = output
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^[A-Z0-9_]+=/.test(line))
      .map(line => line.split('=')[0]);
    
    // Verificar cada categoria
    Object.entries(REQUIRED_ENV_VARS).forEach(([category, vars]) => {
      log(`\n📋 ${category.toUpperCase()}:`, 'blue');
      
      vars.forEach(varName => {
        if (secretNames.includes(varName)) {
          logSuccess(`${varName} configurado`);
        } else {
          logError(`${varName} NÃO configurado`);
          hasErrors = true;
        }
      });
    });
    
    logInfo(`Total de secrets configurados: ${secretNames.length}`);
    
  } catch (error) {
    logError('Não foi possível verificar as secrets do EAS');
    logError('Execute: eas env:list');
    hasErrors = true;
  }
}

function checkRequiredFiles() {
  logSection('VERIFICANDO ARQUIVOS OBRIGATÓRIOS');
  
  REQUIRED_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      logSuccess(`${file} encontrado`);
    } else {
      logError(`${file} NÃO encontrado`);
      hasErrors = true;
    }
  });
}

function checkPackageJson() {
  logSection('VERIFICANDO PACKAGE.JSON');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Verificar scripts
    log('\n📋 SCRIPTS:', 'blue');
    REQUIRED_SCRIPTS.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        logSuccess(`Script '${script}' configurado`);
      } else {
        logError(`Script '${script}' NÃO configurado`);
        hasErrors = true;
      }
    });
    
    // Verificar dependências importantes
    log('\n📦 DEPENDÊNCIAS:', 'blue');
    const importantDeps = ['expo', '@expo/cli', 'eas-cli'];
    
    importantDeps.forEach(dep => {
      const inDeps = packageJson.dependencies && packageJson.dependencies[dep];
      const inDevDeps = packageJson.devDependencies && packageJson.devDependencies[dep];
      
      if (inDeps || inDevDeps) {
        logSuccess(`${dep} instalado`);
      } else {
        logWarning(`${dep} não encontrado`);
        hasWarnings = true;
      }
    });
    
  } catch (error) {
    logError('Erro ao ler package.json');
    hasErrors = true;
  }
}

function checkEASJson() {
  logSection('VERIFICANDO EAS.JSON');
  
  try {
    const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
    
    // Verificar configurações de build
    if (easJson.build) {
      logSuccess('Configurações de build encontradas');
      
      if (easJson.build.production) {
        logSuccess('Profile de produção configurado');
      } else {
        logError('Profile de produção NÃO configurado');
        hasErrors = true;
      }
      
      if (easJson.build.preview) {
        logSuccess('Profile de preview configurado');
      } else {
        logWarning('Profile de preview não configurado');
        hasWarnings = true;
      }
    } else {
      logError('Configurações de build NÃO encontradas');
      hasErrors = true;
    }
    
    // Verificar configurações de submit
    if (easJson.submit) {
      logSuccess('Configurações de submit encontradas');
      
      if (easJson.submit.production) {
        logSuccess('Submit de produção configurado');
      } else {
        logError('Submit de produção NÃO configurado');
        hasErrors = true;
      }
    } else {
      logError('Configurações de submit NÃO encontradas');
      hasErrors = true;
    }
    
  } catch (error) {
    logError('Erro ao ler eas.json');
    hasErrors = true;
  }
}

function checkAppJson() {
  logSection('VERIFICANDO APP.JSON');
  
  try {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    const expo = appJson.expo;
    
    if (!expo) {
      logError('Configuração expo não encontrada em app.json');
      hasErrors = true;
      return;
    }
    
    // Verificar configurações básicas
    const requiredFields = ['name', 'slug', 'version', 'platforms'];
    requiredFields.forEach(field => {
      if (expo[field]) {
        logSuccess(`${field} configurado`);
      } else {
        logError(`${field} NÃO configurado`);
        hasErrors = true;
      }
    });
    
    // Verificar configurações específicas
    if (expo.ios && expo.ios.bundleIdentifier) {
      logSuccess('Bundle identifier iOS configurado');
    } else {
      logError('Bundle identifier iOS NÃO configurado');
      hasErrors = true;
    }
    
    if (expo.android && expo.android.package) {
      logSuccess('Package name Android configurado');
    } else {
      logError('Package name Android NÃO configurado');
      hasErrors = true;
    }
    
    // Verificar ícone e splash
    if (expo.icon) {
      if (fs.existsSync(expo.icon)) {
        logSuccess('Ícone do app encontrado');
      } else {
        logWarning('Arquivo de ícone não encontrado');
        hasWarnings = true;
      }
    } else {
      logWarning('Ícone do app não configurado');
      hasWarnings = true;
    }
    
  } catch (error) {
    logError('Erro ao ler app.json');
    hasErrors = true;
  }
}

function checkEASCLI() {
  logSection('VERIFICANDO EAS CLI');
  
  try {
    const version = execSync('eas --version', { encoding: 'utf8' }).trim();
    logSuccess(`EAS CLI instalado (versão: ${version})`);
    
    // Verificar se está logado
    try {
      execSync('eas whoami', { encoding: 'utf8' });
      logSuccess('Usuário logado no EAS');
    } catch {
      logError('Usuário NÃO logado no EAS');
      logInfo('Execute: eas login');
      hasErrors = true;
    }
    
  } catch (error) {
    logError('EAS CLI não instalado ou não encontrado');
    logInfo('Execute: npm install -g eas-cli');
    hasErrors = true;
  }
}

function showSummary() {
  logSection('RESUMO DA VERIFICAÇÃO');
  
  if (!hasErrors && !hasWarnings) {
    log('\n🎉 TUDO PRONTO PARA PUBLICAÇÃO!', 'green');
    log('✅ Todas as verificações passaram', 'green');
    log('✅ O aplicativo está 100% configurado', 'green');
    
    log('\n📋 PRÓXIMOS PASSOS:', 'cyan');
    log('1. npm run build:android', 'gray');
    log('2. npm run build:ios', 'gray');
    log('3. npm run submit:android', 'gray');
    log('4. npm run submit:ios', 'gray');
    
  } else if (hasErrors) {
    log('\n❌ EXISTEM PROBLEMAS QUE PRECISAM SER CORRIGIDOS', 'red');
    log('🔧 Execute o script de configuração:', 'yellow');
    log('   .\\scripts\\setup-publication-secrets.ps1', 'gray');
    
  } else if (hasWarnings) {
    log('\n⚠️  VERIFICAÇÃO CONCLUÍDA COM AVISOS', 'yellow');
    log('✅ Configurações obrigatórias estão OK', 'green');
    log('⚠️  Algumas configurações opcionais podem ser melhoradas', 'yellow');
  }
  
  log(`\n📊 ESTATÍSTICAS:`, 'blue');
  log(`   Erros: ${hasErrors ? '❌' : '✅'} ${hasErrors ? 'Encontrados' : 'Nenhum'}`, hasErrors ? 'red' : 'green');
  log(`   Avisos: ${hasWarnings ? '⚠️' : '✅'} ${hasWarnings ? 'Encontrados' : 'Nenhum'}`, hasWarnings ? 'yellow' : 'green');
}

// Função principal
async function main() {
  log('🔍 VERIFICAÇÃO PRÉ-BUILD - AÇUCARADAS ENCOMENDAS', 'cyan');
  log('='.repeat(60), 'gray');
  log('Verificando se o aplicativo está pronto para build e publicação...\n', 'gray');
  
  try {
    await checkEASSecrets();
    checkRequiredFiles();
    checkPackageJson();
    checkEASJson();
    checkAppJson();
    checkEASCLI();
    
    showSummary();
    
    // Exit code baseado nos resultados
    if (hasErrors) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    logError(`Erro durante a verificação: ${error.message}`);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
