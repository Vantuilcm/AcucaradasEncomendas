/**
 * Script para verificar as integrações externas do aplicativo Açucaradas Encomendas
 * Este script verifica se Firebase, Stripe e OneSignal estão configurados corretamente
 * para o ambiente de produção.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Códigos de saída
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_WARNING = 2;

// Cores para console
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

// Estado das verificações
let firebaseStatus = 'OK';
let stripeStatus = 'OK';
let oneSignalStatus = 'OK';

// Contador de problemas
let problemCount = 0;

/**
 * Verificar se um arquivo existe no projeto
 */
function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

/**
 * Verificar se um pacote está instalado
 */
function packageInstalled(packageName) {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    return (
      (packageJson.dependencies && packageJson.dependencies[packageName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[packageName])
    );
  } catch (error) {
    console.error(`${RED}Erro ao verificar o pacote ${packageName}:${RESET}`, error);
    return false;
  }
}

/**
 * Exibir mensagem de sucesso
 */
function logSuccess(message) {
  console.log(`${GREEN}✓ ${message}${RESET}`);
}

/**
 * Exibir mensagem de erro
 */
function logError(message) {
  console.log(`${RED}✗ ${message}${RESET}`);
  problemCount++;
}

/**
 * Exibir mensagem de aviso
 */
function logWarning(message) {
  console.log(`${YELLOW}! ${message}${RESET}`);
  // Avisos não são contados como problemas críticos, mas como avisos
}

/**
 * Exibir título de seção
 */
function logSection(title) {
  console.log(`\n${BLUE}### ${title} ###${RESET}\n`);
}

/**
 * Verificar configuração do Firebase
 */
function checkFirebase() {
  logSection('Verificando Firebase');

  // Verificar google-services.json para Android
  const googleServicesPath = 'android/app/google-services.json';
  const googleServicesProdPath = 'android/app/google-services.prod.json';

  if (fileExists(googleServicesProdPath)) {
    logSuccess('Arquivo google-services.prod.json encontrado para produção');
  } else {
    logError('Arquivo google-services.prod.json não encontrado para produção');
    firebaseStatus = 'ERRO';
  }

  if (fileExists(googleServicesPath)) {
    logSuccess('Arquivo google-services.json encontrado');

    // Verificar se é a versão de produção
    try {
      const googleServices = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), googleServicesPath), 'utf8')
      );
      const googleServicesProd = fileExists(googleServicesProdPath)
        ? JSON.parse(fs.readFileSync(path.join(process.cwd(), googleServicesProdPath), 'utf8'))
        : null;

      if (
        googleServicesProd &&
        JSON.stringify(googleServices) !== JSON.stringify(googleServicesProd)
      ) {
        logWarning('O aplicativo não está usando a configuração de produção do Firebase');
        if (firebaseStatus === 'OK') firebaseStatus = 'AVISO';
      }
    } catch (error) {
      logError('Erro ao analisar o arquivo google-services.json');
      firebaseStatus = 'ERRO';
    }
  } else {
    logError('Arquivo google-services.json não encontrado');
    firebaseStatus = 'ERRO';
  }

  // Verificar GoogleService-Info.plist para iOS
  const googleServiceInfoPath = 'ios/GoogleService-Info.plist';
  if (fileExists(googleServiceInfoPath)) {
    logSuccess('Arquivo GoogleService-Info.plist encontrado para iOS');

    // Verificar se é a versão de produção (simplificado)
    const content = fs.readFileSync(path.join(process.cwd(), googleServiceInfoPath), 'utf8');
    if (
      content.includes('IS_ANALYTICS_ENABLED = NO') ||
      content.includes('IS_APPINVITE_ENABLED = NO')
    ) {
      logWarning('GoogleService-Info.plist pode não estar configurado para produção');
      if (firebaseStatus === 'OK') firebaseStatus = 'AVISO';
    }
  } else {
    logError('Arquivo GoogleService-Info.plist não encontrado para iOS');
    firebaseStatus = 'ERRO';
  }

  // Verificar pacotes do Firebase
  if (packageInstalled('@react-native-firebase/app')) {
    logSuccess('Pacote @react-native-firebase/app está instalado');
  } else {
    logWarning('Pacote @react-native-firebase/app não encontrado');
    if (firebaseStatus === 'OK') firebaseStatus = 'AVISO';
  }
}

/**
 * Verificar configuração do Stripe
 */
function checkStripe() {
  logSection('Verificando Stripe');

  // Verificar chave de API do Stripe no .env
  const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (stripeKey) {
    logSuccess('Chave do Stripe encontrada no arquivo .env');

    // Verificar se é chave de produção ou teste
    if (stripeKey.startsWith('pk_test_')) {
      logWarning('Está sendo usada uma chave de teste do Stripe em vez de produção');
      stripeStatus = 'AVISO';
    } else if (stripeKey.startsWith('pk_live_')) {
      logSuccess('Chave de produção do Stripe está configurada');
    } else {
      logWarning('Formato da chave do Stripe não reconhecido');
      stripeStatus = 'AVISO';
    }
  } else {
    logError('Chave do Stripe não encontrada no arquivo .env');
    stripeStatus = 'ERRO';
  }

  // Verificar pacote do Stripe
  if (packageInstalled('@stripe/stripe-react-native')) {
    logSuccess('Pacote @stripe/stripe-react-native está instalado');
  } else {
    logError('Pacote @stripe/stripe-react-native não encontrado');
    stripeStatus = 'ERRO';
  }

  // Verificar webhook do Stripe para produção
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (stripeWebhookSecret) {
    logSuccess('Webhook do Stripe configurado');
  } else {
    logWarning('Webhook do Stripe não configurado no .env');
    if (stripeStatus === 'OK') stripeStatus = 'AVISO';
  }
}

/**
 * Verificar configuração do OneSignal
 */
function checkOneSignal() {
  logSection('Verificando OneSignal');

  // Verificar ID do OneSignal no .env
  const oneSignalAppId = process.env.ONE_SIGNAL_APP_ID;
  if (oneSignalAppId) {
    logSuccess('ID do OneSignal encontrado no arquivo .env');
  } else {
    logError('ID do OneSignal não encontrado no arquivo .env');
    oneSignalStatus = 'ERRO';
  }

  // Verificar pacote de notificações
  if (packageInstalled('expo-notifications')) {
    logSuccess('Pacote expo-notifications está instalado');
  } else {
    logError('Pacote expo-notifications não encontrado');
    oneSignalStatus = 'ERRO';
  }

  // Verificar configuração do plugin no app.json
  try {
    const appJsonPath = path.join(process.cwd(), 'app.json');
    if (fileExists('app.json')) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

      if (
        appJson.expo &&
        appJson.expo.plugins &&
        appJson.expo.plugins.some(plugin =>
          typeof plugin === 'string'
            ? plugin === 'expo-notifications'
            : plugin[0] === 'expo-notifications'
        )
      ) {
        logSuccess('Plugin expo-notifications configurado no app.json');
      } else {
        logWarning('Plugin expo-notifications não encontrado no app.json');
        if (oneSignalStatus === 'OK') oneSignalStatus = 'AVISO';
      }

      // Verificar configuração de notificações para iOS
      if (
        appJson.expo &&
        appJson.expo.ios &&
        appJson.expo.ios.infoPlist &&
        appJson.expo.ios.infoPlist['aps-environment']
      ) {
        logSuccess('Configuração aps-environment encontrada para iOS');
      } else {
        logWarning('Configuração aps-environment não encontrada para iOS');
        if (oneSignalStatus === 'OK') oneSignalStatus = 'AVISO';
      }
    } else {
      logError('Arquivo app.json não encontrado');
      oneSignalStatus = 'ERRO';
    }
  } catch (error) {
    logError('Erro ao analisar o arquivo app.json');
    oneSignalStatus = 'ERRO';
  }
}

/**
 * Exibir resumo das verificações
 */
function showSummary() {
  logSection('Resumo das verificações');

  console.log(
    `Firebase: ${
      firebaseStatus === 'OK'
        ? `${GREEN}OK${RESET}`
        : firebaseStatus === 'AVISO'
          ? `${YELLOW}Problemas encontrados${RESET}`
          : `${RED}Problemas encontrados${RESET}`
    }`
  );

  console.log(
    `Stripe: ${
      stripeStatus === 'OK'
        ? `${GREEN}OK${RESET}`
        : stripeStatus === 'AVISO'
          ? `${YELLOW}Problemas encontrados${RESET}`
          : `${RED}Problemas encontrados${RESET}`
    }`
  );

  console.log(
    `OneSignal: ${
      oneSignalStatus === 'OK'
        ? `${GREEN}OK${RESET}`
        : oneSignalStatus === 'AVISO'
          ? `${YELLOW}Problemas encontrados${RESET}`
          : `${RED}Problemas encontrados${RESET}`
    }`
  );

  if (firebaseStatus === 'OK' && stripeStatus === 'OK' && oneSignalStatus === 'OK') {
    console.log(
      `\n${GREEN}Todas as integrações externas estão configuradas corretamente para produção.${RESET}`
    );
    return EXIT_SUCCESS;
  } else if (firebaseStatus === 'ERRO' || stripeStatus === 'ERRO' || oneSignalStatus === 'ERRO') {
    console.log(
      `\n${RED}Há problemas críticos com as integrações externas que precisam ser resolvidos antes da publicação.${RESET}`
    );
    console.log(
      `${YELLOW}Consulte o arquivo GUIA_CONFIGURACAO_PRODUCAO.md para instruções.${RESET}`
    );
    return EXIT_ERROR;
  } else {
    console.log(
      `\n${YELLOW}As integrações externas estão configuradas, mas algumas não estão em ambiente de produção.${RESET}`
    );
    console.log(`${YELLOW}Revise as configurações antes de publicar.${RESET}`);
    return EXIT_WARNING;
  }
}

/**
 * Função principal
 */
function main() {
  console.log('Iniciando verificação de integrações externas...\n');

  // Executar verificações
  checkFirebase();
  checkStripe();
  checkOneSignal();

  // Mostrar resumo e definir código de saída
  const exitCode = showSummary();
  process.exit(exitCode);
}

// Executar script
main();
