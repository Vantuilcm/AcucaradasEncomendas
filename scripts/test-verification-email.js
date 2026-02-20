/**
 * Script para testar a função Cloud de envio de códigos de verificação
 * Este script simula uma chamada à função sendVerificationCode
 *
 * Uso: node scripts/test-verification-email.js
 */

const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword, connectAuthEmulator } = require('firebase/auth');
const fs = require('fs');
const path = require('path');
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

// Função para perguntar ao usuário
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Função principal
async function main() {
  console.log(
    `${BOLD}${CYAN}===== TESTE DA FUNÇÃO CLOUD PARA ENVIO DE CÓDIGOS DE VERIFICAÇÃO =====\n${RESET}`
  );

  // Carregar a configuração do Firebase
  console.log(`${BLUE}Carregando configuração do Firebase...${RESET}`);

  let firebaseConfig;
  try {
    // Tentar carregar de várias possíveis localizações
    const configLocations = [
      path.join(process.cwd(), 'src', 'config', 'firebase.config.js'),
      path.join(process.cwd(), 'src', 'config', 'firebase.js'),
      path.join(process.cwd(), '.env'),
    ];

    let configFound = false;

    // Tentar encontrar arquivo de configuração
    for (const location of configLocations) {
      if (fs.existsSync(location)) {
        if (location.endsWith('.js')) {
          firebaseConfig = require(location);
          configFound = true;
          console.log(`${GREEN}✓ Configuração carregada de ${location}${RESET}`);
          break;
        } else if (location.endsWith('.env')) {
          // Carregar de .env
          const envContent = fs.readFileSync(location, 'utf8');
          const envVars = envContent.split('\n').reduce((acc, line) => {
            const match = line.match(/^FIREBASE_(.+)=(.+)$/);
            if (match) {
              const key = match[1].toLowerCase();
              const value = match[2].trim();
              acc[key] = value;
            }
            return acc;
          }, {});

          if (Object.keys(envVars).length > 0) {
            firebaseConfig = envVars;
            configFound = true;
            console.log(`${GREEN}✓ Configuração carregada de ${location}${RESET}`);
            break;
          }
        }
      }
    }

    // Se não encontrou configuração, perguntar manualmente
    if (!configFound) {
      console.log(`${YELLOW}Configuração do Firebase não encontrada automaticamente.${RESET}`);
      console.log(`${YELLOW}Por favor, insira as informações manualmente:${RESET}`);

      firebaseConfig = {
        apiKey: await askQuestion('Firebase API Key: '),
        authDomain: await askQuestion('Firebase Auth Domain: '),
        projectId: await askQuestion('Firebase Project ID: '),
      };
    }
  } catch (error) {
    console.error(`${RED}Erro ao carregar configuração do Firebase: ${error.message}${RESET}`);
    rl.close();
    return;
  }

  // Inicializar Firebase
  try {
    console.log(`${BLUE}Inicializando Firebase...${RESET}`);
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const functions = getFunctions(app);

    // Verificar se deve usar emuladores
    const useEmulators = await askQuestion(
      `${YELLOW}Deseja usar os emuladores locais? (S/n): ${RESET}`
    );

    if (useEmulators.toLowerCase() !== 'n') {
      console.log(`${BLUE}Conectando aos emuladores...${RESET}`);
      connectFunctionsEmulator(functions, 'localhost', 5001);
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log(`${GREEN}✓ Conectado aos emuladores${RESET}`);
    }

    // Login com usuário de teste
    console.log(`${BLUE}Realizando login para teste...${RESET}`);

    const email = await askQuestion('Email de teste: ');
    const password = await askQuestion('Senha: ');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log(`${GREEN}✓ Login realizado com sucesso (UID: ${user.uid})${RESET}`);

      // Gerar código de verificação
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`${BLUE}Código de verificação gerado: ${code}${RESET}`);

      // Chamar a função Cloud
      console.log(`${BLUE}Chamando a função Cloud sendVerificationCode...${RESET}`);
      const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode');

      const result = await sendVerificationCode({
        email: email,
        code: code,
      });

      console.log(`${GREEN}${BOLD}✓ Email enviado com sucesso!${RESET}`);
      console.log(`Resposta da função: ${JSON.stringify(result.data, null, 2)}`);

      // Verificar recebimento
      console.log(
        `\n${YELLOW}Por favor, verifique sua caixa de entrada (e a pasta de spam) para confirmar o recebimento do email.${RESET}`
      );
      const emailReceived = await askQuestion('Email recebido? (S/n): ');

      if (emailReceived.toLowerCase() !== 'n') {
        console.log(`${GREEN}${BOLD}✓ Teste concluído com sucesso!${RESET}`);
      } else {
        console.log(`${RED}${BOLD}✗ Falha no teste. O email não foi recebido.${RESET}`);
        console.log(
          `${YELLOW}Verifique os logs da função no Firebase Console para mais detalhes.${RESET}`
        );
      }
    } catch (error) {
      console.error(`${RED}Erro durante o teste: ${error.message}${RESET}`);
      if (error.code) {
        console.error(`${RED}Código de erro: ${error.code}${RESET}`);
      }
    }
  } catch (error) {
    console.error(`${RED}Erro durante a inicialização: ${error.message}${RESET}`);
  }

  rl.close();
}

// Executar teste
main().catch(error => {
  console.error(`${RED}Erro: ${error.message}${RESET}`);
  rl.close();
});
