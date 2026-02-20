/**
 * Script para configurar o ambiente de teste para autenticação em dois fatores
 * Este script prepara um ambiente para testar o 2FA em um contexto similiar ao de produção
 *
 * Uso: node scripts/setup-2fa-test-env.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Cores para console
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

// Caminho dos arquivos
const FIREBASE_RC = '.firebaserc';
const FIREBASE_JSON = 'firebase.json';
const FUNCTIONS_PATH = 'functions';
const FIREBASE_CONFIG = 'src/config/firebase.ts';

/**
 * Perguntar ao usuário
 */
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

/**
 * Verificar se o Firebase CLI está instalado
 */
async function checkFirebaseCLI() {
  try {
    console.log(`${BLUE}Verificando Firebase CLI...${RESET}`);
    execSync('npx firebase --version', { stdio: 'pipe' });
    console.log(`${GREEN}✓ Firebase CLI encontrado${RESET}`);
    return true;
  } catch (error) {
    console.error(`${RED}✗ Firebase CLI não encontrado${RESET}`);
    console.log(`${YELLOW}Instalando Firebase CLI globalmente...${RESET}`);

    try {
      execSync('npm install -g firebase-tools', { stdio: 'inherit' });
      console.log(`${GREEN}✓ Firebase CLI instalado com sucesso${RESET}`);
      return true;
    } catch (installError) {
      console.error(`${RED}✗ Falha ao instalar Firebase CLI: ${installError.message}${RESET}`);
      return false;
    }
  }
}

/**
 * Verificar configuração do Firebase
 */
function checkFirebaseConfig() {
  console.log(`${BLUE}Verificando configuração do Firebase...${RESET}`);

  if (!fs.existsSync(FIREBASE_RC)) {
    console.error(`${RED}✗ Arquivo .firebaserc não encontrado${RESET}`);
    return false;
  }

  if (!fs.existsSync(FIREBASE_JSON)) {
    console.error(`${RED}✗ Arquivo firebase.json não encontrado${RESET}`);
    return false;
  }

  console.log(`${GREEN}✓ Configuração do Firebase encontrada${RESET}`);
  return true;
}

/**
 * Verificar implementação da função sendVerificationCode
 */
function checkCloudFunction() {
  console.log(`${BLUE}Verificando função Cloud...${RESET}`);

  const functionsIndexPath = path.join(FUNCTIONS_PATH, 'index.js');
  if (!fs.existsSync(functionsIndexPath)) {
    console.error(`${RED}✗ Arquivo functions/index.js não encontrado${RESET}`);
    return false;
  }

  const functionsContent = fs.readFileSync(functionsIndexPath, 'utf8');
  if (!functionsContent.includes('exports.sendVerificationCode')) {
    console.error(`${RED}✗ Função sendVerificationCode não encontrada${RESET}`);
    return false;
  }

  console.log(`${GREEN}✓ Função Cloud sendVerificationCode encontrada${RESET}`);
  return true;
}

/**
 * Configurar variáveis de ambiente para testes
 */
function setupEnvironmentVars() {
  console.log(`${BLUE}Configurando variáveis de ambiente para teste...${RESET}`);

  const runtimeConfigPath = path.join(FUNCTIONS_PATH, '.runtimeconfig.json');

  // Verificar se o arquivo já existe
  let config = {};
  if (fs.existsSync(runtimeConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'));
      console.log(`${GREEN}✓ Arquivo .runtimeconfig.json encontrado${RESET}`);
    } catch (error) {
      console.error(`${RED}✗ Erro ao ler .runtimeconfig.json: ${error.message}${RESET}`);
      config = {};
    }
  }

  // Configurar email para teste
  if (!config.email) {
    config.email = {
      user: 'teste@acucaradasencomendas.com.br',
      password: 'senha_teste_para_email',
      sender: 'noreply@acucaradasencomendas.com.br',
    };
  }

  // Salvar configuração
  fs.writeFileSync(runtimeConfigPath, JSON.stringify(config, null, 2));
  console.log(`${GREEN}✓ Variáveis de ambiente configuradas${RESET}`);

  return true;
}

/**
 * Iniciar emuladores do Firebase
 */
function startEmulators() {
  console.log(`${BLUE}Iniciando emuladores do Firebase...${RESET}`);
  console.log(`${YELLOW}Os emuladores serão iniciados em um novo terminal.${RESET}`);
  console.log(`${YELLOW}Pressione Ctrl+C no terminal dos emuladores para encerrar.${RESET}`);

  try {
    // Comando diferente dependendo do sistema operacional
    if (process.platform === 'win32') {
      // Windows - abrir em nova janela
      execSync('start cmd /k "npx firebase emulators:start --only auth,firestore,functions"', {
        stdio: 'ignore',
      });
    } else {
      // macOS/Linux - usar terminal atual
      execSync('npx firebase emulators:start --only auth,firestore,functions &', {
        stdio: 'ignore',
      });
    }

    console.log(`${GREEN}✓ Emuladores iniciados${RESET}`);
    return true;
  } catch (error) {
    console.error(`${RED}✗ Falha ao iniciar emuladores: ${error.message}${RESET}`);
    return false;
  }
}

/**
 * Configurar Firebase para usar emuladores
 */
async function configureFirebaseEmulators() {
  console.log(`${BLUE}Configurando firebase.ts para usar emuladores...${RESET}`);

  if (!fs.existsSync(FIREBASE_CONFIG)) {
    console.error(`${RED}✗ Arquivo firebase.ts não encontrado${RESET}`);
    return false;
  }

  let firebaseContent = fs.readFileSync(FIREBASE_CONFIG, 'utf8');

  // Verificar se já tem configuração de emuladores
  if (
    firebaseContent.includes('connectFirestoreEmulator') ||
    firebaseContent.includes('connectAuthEmulator') ||
    firebaseContent.includes('connectFunctionsEmulator')
  ) {
    console.log(`${GREEN}✓ Configuração de emuladores já existe${RESET}`);

    const useExisting = await askQuestion(
      `${YELLOW}Deseja manter a configuração existente? (S/n): ${RESET}`
    );
    if (useExisting.toLowerCase() !== 'n') {
      return true;
    }
  }

  // Adicionar código para conectar aos emuladores
  const emulatorCode = `
// Conectar aos emuladores no ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  try {
    const { connectFirestoreEmulator } = require('firebase/firestore');
    const { connectAuthEmulator } = require('firebase/auth');
    const { connectFunctionsEmulator } = require('firebase/functions');
    
    console.log('Conectando aos emuladores do Firebase');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    console.error('Erro ao conectar aos emuladores:', error);
  }
}`;

  // Encontrar posição para inserir o código
  const exportPosition = firebaseContent.lastIndexOf('export {');
  if (exportPosition === -1) {
    console.error(`${RED}✗ Não foi possível encontrar ponto de inserção em firebase.ts${RESET}`);
    return false;
  }

  // Inserir código antes da exportação
  const newContent =
    firebaseContent.substring(0, exportPosition) +
    emulatorCode +
    '\n\n' +
    firebaseContent.substring(exportPosition);

  // Salvar arquivo
  fs.writeFileSync(FIREBASE_CONFIG, newContent);
  console.log(`${GREEN}✓ Firebase configurado para usar emuladores${RESET}`);

  return true;
}

/**
 * Função principal
 */
async function main() {
  console.log(`${BOLD}${CYAN}===== CONFIGURAÇÃO DO AMBIENTE DE TESTE PARA 2FA =====\n${RESET}`);

  // Verificar pré-requisitos
  const hasFirebaseCLI = await checkFirebaseCLI();
  const hasFirebaseConfig = checkFirebaseConfig();
  const hasCloudFunction = checkCloudFunction();

  if (!hasFirebaseCLI || !hasFirebaseConfig || !hasCloudFunction) {
    console.error(
      `${RED}${BOLD}✗ Pré-requisitos não atendidos. Corrija os problemas acima.${RESET}`
    );
    rl.close();
    return;
  }

  // Configurar ambiente
  setupEnvironmentVars();
  await configureFirebaseEmulators();

  // Iniciar emuladores
  const startEmulatorsNow = await askQuestion(
    `${YELLOW}Deseja iniciar os emuladores agora? (S/n): ${RESET}`
  );
  if (startEmulatorsNow.toLowerCase() !== 'n') {
    startEmulators();
  }

  console.log(`\n${GREEN}${BOLD}✓ Ambiente de teste configurado com sucesso!${RESET}`);
  console.log(`\nPara testar o fluxo completo de 2FA, execute:`);
  console.log(`${BLUE}node scripts/test-2fa-workflow.js${RESET}`);

  console.log(`\n${BOLD}${CYAN}===== CONFIGURAÇÃO CONCLUÍDA =====\n${RESET}`);
  rl.close();
}

main().catch(error => {
  console.error(`${RED}Erro: ${error.message}${RESET}`);
  rl.close();
});
