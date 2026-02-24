#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
let dotenv;
try {
  dotenv = require('dotenv');
} catch (error) {
  // dotenv is optional, continue without it
}

// Códigos de saída
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_WARNING = 2;

// Cores para formatação do console
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let criticalProblems = 0;
let warnings = 0;

// Função para log de sucesso
function logSuccess(message) {
  console.log(`${GREEN}✓ ${message}${RESET}`);
}

// Função para log de erro
function logError(message) {
  console.error(`${RED}✗ ${message}${RESET}`);
  criticalProblems++;
}

// Função para log de aviso
function logWarning(message) {
  console.warn(`${YELLOW}⚠ ${message}${RESET}`);
  warnings++;
}

// Função para checar se o arquivo existe
function checkFileExists(filePath, displayName) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    logSuccess(`${displayName} encontrado: ${filePath}`);
    return true;
  } else {
    logError(`${displayName} não encontrado: ${filePath}`);
    return false;
  }
}

// Função para verificar se um arquivo contém identificadores de produção
function checkFileForProductionIdentifiers(filePath, identifiers, displayName) {
  if (!checkFileExists(filePath, displayName)) {
    return false;
  }

  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
    let allFound = true;

    for (const identifier of identifiers) {
      if (content.includes(identifier)) {
        logSuccess(`Identificador de produção '${identifier}' encontrado em ${displayName}`);
      } else {
        logError(`Identificador de produção '${identifier}' NÃO encontrado em ${displayName}`);
        allFound = false;
      }
    }

    return allFound;
  } catch (error) {
    logError(`Erro ao ler ${displayName}: ${error.message}`);
    return false;
  }
}

// Função para verificar variáveis de ambiente
function checkEnvVars(envVars, prodIdentifiers, devIdentifiers) {
  let allCorrect = true;
  const envValues = {};

  // Carregar variáveis de ambiente do arquivo .env se o dotenv estiver disponível
  if (dotenv && fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    Object.assign(envValues, envConfig);
  }

  // Combinar com variáveis de ambiente do processo
  Object.assign(envValues, process.env);

  for (const envVar of envVars) {
    const value = envValues[envVar];

    if (!value) {
      logWarning(`Variável de ambiente ${envVar} não definida`);
      continue;
    }

    // Caso especial para API_URL
    if (envVar === 'API_URL' && value.includes('api.acucaradas.com.br')) {
      logSuccess(`${envVar} configurado para produção: ${value}`);
      continue;
    }

    let isProd = false;
    let isDev = false;

    // Verificar se a variável contém identificadores de produção
    for (const prodId of prodIdentifiers) {
      if (value.includes(prodId)) {
        isProd = true;
        break;
      }
    }

    // Verificar se a variável contém identificadores de desenvolvimento
    for (const devId of devIdentifiers) {
      if (value.includes(devId)) {
        isDev = true;
        break;
      }
    }

    if (isProd && !isDev) {
      logSuccess(`${envVar} configurado para produção: ${value}`);
    } else if (isDev) {
      logError(`${envVar} configurado para desenvolvimento: ${value}`);
      allCorrect = false;
    } else {
      logWarning(`Não foi possível determinar se ${envVar} está configurado para produção`);
    }
  }

  return allCorrect;
}

// Verificar configurações do Firebase
function checkFirebaseConfig() {
  console.log(`\n${BOLD}Verificando configurações do Firebase...${RESET}`);

  // Verificar arquivos de configuração do Firebase para Android
  const androidConfigExists = checkFileExists(
    'android/app/google-services.json',
    'Arquivo de configuração Firebase Android'
  );
  const androidProdConfigExists = checkFileExists(
    'android/app/google-services.prod.json',
    'Arquivo de produção Firebase Android'
  );

  // Se ambos existirem, verificar se são idênticos (como deveriam ser para produção)
  if (androidConfigExists && androidProdConfigExists) {
    try {
      const config = JSON.stringify(
        JSON.parse(fs.readFileSync('android/app/google-services.json', 'utf8'))
      );
      const prodConfig = JSON.stringify(
        JSON.parse(fs.readFileSync('android/app/google-services.prod.json', 'utf8'))
      );

      if (config === prodConfig) {
        logSuccess('Arquivo google-services.json é idêntico ao google-services.prod.json');
      } else {
        logError('Arquivo google-services.json NÃO é idêntico ao google-services.prod.json');
      }
    } catch (error) {
      logError(`Erro ao comparar arquivos de configuração Firebase Android: ${error.message}`);
    }
  }

  // Verificar arquivos de configuração do Firebase para iOS
  const iosConfigExists = checkFileExists(
    'ios/GoogleService-Info.plist',
    'Arquivo de configuração Firebase iOS'
  );
  const iosProdConfigExists = checkFileExists(
    'ios/GoogleService-Info.prod.plist',
    'Arquivo de produção Firebase iOS'
  );

  // Se ambos existirem, verificar se são idênticos (como deveriam ser para produção)
  if (iosConfigExists && iosProdConfigExists) {
    try {
      const config = fs.readFileSync('ios/GoogleService-Info.plist', 'utf8');
      const prodConfig = fs.readFileSync('ios/GoogleService-Info.prod.plist', 'utf8');

      if (config === prodConfig) {
        logSuccess('Arquivo GoogleService-Info.plist é idêntico ao GoogleService-Info.prod.plist');
      } else {
        logError(
          'Arquivo GoogleService-Info.plist NÃO é idêntico ao GoogleService-Info.prod.plist'
        );
      }
    } catch (error) {
      logError(`Erro ao comparar arquivos de configuração Firebase iOS: ${error.message}`);
    }
  }

  // Verificar regras de segurança do Firestore
  if (checkFileExists('firestore.rules', 'Arquivo de regras do Firestore')) {
    const rules = fs.readFileSync('firestore.rules', 'utf8');

    if (rules.includes('allow read, write: if false;')) {
      logSuccess('Regras de segurança do Firestore contêm restrições adequadas para produção');
    } else if (rules.includes('allow read, write: if true;')) {
      logError('Regras de segurança do Firestore permitem acesso irrestrito');
    } else {
      logWarning('Verifique manualmente as regras de segurança do Firestore');
    }
  }
}

// Verificar configurações do Stripe
function checkStripeConfig() {
  console.log(`\n${BOLD}Verificando configurações do Stripe...${RESET}`);

  // Arquivos comuns onde chaves Stripe podem estar definidas
  const stripeFiles = [
    'App.js',
    'app.js',
    'src/config/stripe.js',
    'src/config/stripe.ts',
    'src/services/payment.js',
    'src/services/payment.ts',
    '.env',
    'src/env.js',
    'src/env.ts',
  ];

  // Verificar chaves de teste vs produção
  let stripeKeyFound = false;

  for (const file of stripeFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');

      // Verificar chaves de teste
      if (content.includes('pk_test_') || content.includes('sk_test_')) {
        logError(`Chave de teste do Stripe encontrada em ${file}`);
        stripeKeyFound = true;
      }

      // Verificar chaves de produção
      if (content.includes('pk_live_') || content.includes('sk_live_')) {
        logSuccess(`Chave de produção do Stripe encontrada em ${file}`);
        stripeKeyFound = true;
      }

      // Verificar se há chaves secretas no código-fonte
      if (content.includes('sk_live_') || content.includes('sk_test_')) {
        logError(`CHAVE SECRETA do Stripe encontrada em ${file} - Isso é um risco de segurança!`);
      }
    }
  }

  if (!stripeKeyFound) {
    logWarning('Não foi possível localizar nenhuma chave do Stripe. Verifique manualmente.');
  }
}

// Verificar configurações do OneSignal
function checkOneSignalConfig() {
  console.log(`\n${BOLD}Verificando configurações do OneSignal...${RESET}`);

  // Arquivos comuns onde IDs do OneSignal podem estar definidos
  const oneSignalFiles = [
    'src/config/notifications.js',
    'src/config/notifications.ts',
    'src/config/onesignal.js',
    'src/config/onesignal.ts',
    'app.json',
    'app.config.js',
    'app.config.ts',
  ];

  let oneSignalIdFound = false;

  for (const file of oneSignalFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');

      // Buscar por padrões comuns de IDs do OneSignal
      const oneSignalIdPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
      const matches = content.match(oneSignalIdPattern);

      if (matches && matches.length > 0) {
        logSuccess(`ID do OneSignal encontrado em ${file}: ${matches[0]}`);
        oneSignalIdFound = true;
      }
    }
  }

  if (!oneSignalIdFound) {
    logWarning('Não foi possível localizar nenhum ID do OneSignal. Verifique manualmente.');
  }

  // Verificar AndroidManifest.xml para permissões necessárias
  const androidManifestPath = 'android/app/src/main/AndroidManifest.xml';
  if (fs.existsSync(androidManifestPath)) {
    const manifest = fs.readFileSync(androidManifestPath, 'utf8');

    // Verificar permissões necessárias para o OneSignal
    if (manifest.includes('com.google.android.c2dm.permission.RECEIVE')) {
      logSuccess('Permissão RECEIVE para FCM encontrada no AndroidManifest.xml');
    } else {
      logWarning('Permissão RECEIVE para FCM não encontrada no AndroidManifest.xml');
    }
  }
}

// Verificar outras configurações importantes
function checkOtherConfigs() {
  console.log(`\n${BOLD}Verificando outras configurações importantes...${RESET}`);

  // Verificar variáveis de ambiente
  const envVars = ['NODE_ENV', 'API_URL', 'ENV', 'ENVIRONMENT'];
  checkEnvVars(envVars, ['production', 'prod'], ['development', 'dev', 'local', 'test']);

  // Verificar app.json para nome e versão apropriados
  if (fs.existsSync('app.json')) {
    try {
      const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));

      // Verificar nome do app
      if (appConfig.expo && appConfig.expo.name) {
        if (
          appConfig.expo.name.toLowerCase().includes('dev') ||
          appConfig.expo.name.toLowerCase().includes('test')
        ) {
          logError(`Nome do app parece ser para desenvolvimento: ${appConfig.expo.name}`);
        } else {
          logSuccess(`Nome do app parece estar correto para produção: ${appConfig.expo.name}`);
        }
      }

      // Verificar versão do app
      if (appConfig.expo && appConfig.expo.version) {
        const versionParts = appConfig.expo.version.split('.');
        if (
          versionParts.some(
            part => part.includes('beta') || part.includes('alpha') || part.includes('test')
          )
        ) {
          logWarning(`Versão do app parece ser uma versão de teste: ${appConfig.expo.version}`);
        } else {
          logSuccess(`Versão do app parece adequada para produção: ${appConfig.expo.version}`);
        }
      }
    } catch (error) {
      logError(`Erro ao analisar app.json: ${error.message}`);
    }
  }
}

// Função principal
function main() {
  console.log(`${BOLD}VERIFICAÇÃO DE CONFIGURAÇÕES DE PRODUÇÃO${RESET}\n`);

  checkFirebaseConfig();
  checkStripeConfig();
  checkOneSignalConfig();
  checkOtherConfigs();

  // Exibir resumo
  console.log(`\n${BOLD}RESUMO:${RESET}`);

  if (criticalProblems === 0 && warnings === 0) {
    console.log(
      `${GREEN}${BOLD}Nenhum problema encontrado! Seu app parece estar pronto para publicação.${RESET}`
    );
    process.exit(EXIT_SUCCESS);
  } else {
    if (criticalProblems > 0) {
      console.log(
        `${RED}${BOLD}Encontrados ${criticalProblems} problemas críticos que precisam ser corrigidos antes da publicação.${RESET}`
      );
    }

    if (warnings > 0) {
      console.log(
        `${YELLOW}${BOLD}Encontrados ${warnings} avisos que devem ser verificados manualmente.${RESET}`
      );
    }

    if (criticalProblems > 0) {
      process.exit(EXIT_ERROR);
    } else {
      process.exit(EXIT_WARNING);
    }
  }
}

// Executar a verificação
main();
