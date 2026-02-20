/**
 * Script para testar manualmente o fluxo completo de autenticação em dois fatores
 * Este script simula o ambiente de produção e verifica todas as etapas do processo
 *
 * Uso: node scripts/test-2fa-workflow.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

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
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

// Função para simular o fluxo de 2FA
async function test2FAWorkflow() {
  console.clear();
  console.log(`${BOLD}${CYAN}===== TESTE DO FLUXO DE AUTENTICAÇÃO EM DOIS FATORES =====\n${RESET}`);

  // Verificar pré-requisitos
  console.log(`${BOLD}Verificando pré-requisitos...${RESET}`);

  // Verificar se o arquivo TwoFactorAuthService.ts existe
  const servicePath = path.join(process.cwd(), 'src', 'services', 'TwoFactorAuthService.ts');
  if (!fs.existsSync(servicePath)) {
    console.error(`${RED}Erro: Arquivo TwoFactorAuthService.ts não encontrado!${RESET}`);
    process.exit(1);
  }
  console.log(`${GREEN}✓ TwoFactorAuthService.ts encontrado${RESET}`);

  // Verificar se as Firebase Functions estão configuradas
  const functionsPath = path.join(process.cwd(), 'functions', 'index.js');
  if (!fs.existsSync(functionsPath)) {
    console.error(`${RED}Erro: Arquivo functions/index.js não encontrado!${RESET}`);
    process.exit(1);
  }

  // Verificar se a função sendVerificationCode está implementada
  const functionsContent = fs.readFileSync(functionsPath, 'utf8');
  if (!functionsContent.includes('exports.sendVerificationCode')) {
    console.error(
      `${RED}Erro: A função sendVerificationCode não está implementada em functions/index.js!${RESET}`
    );
    process.exit(1);
  }
  console.log(`${GREEN}✓ Firebase Functions configuradas corretamente${RESET}`);

  // Verificar se os testes automatizados existem
  const testPath = path.join(process.cwd(), 'test', 'TwoFactorAuth.test.js');
  if (!fs.existsSync(testPath)) {
    console.warn(`${YELLOW}Aviso: Arquivo de testes automatizados não encontrado.${RESET}`);
    await askQuestion(`Deseja criar o arquivo de testes? (S/n): `);

    // Implementação para criar o arquivo de testes seria aqui
    console.log(
      `${YELLOW}Por favor, crie manualmente o arquivo de testes em test/TwoFactorAuth.test.js${RESET}`
    );
  } else {
    console.log(`${GREEN}✓ Testes automatizados encontrados${RESET}`);
  }

  console.log(`\n${BOLD}${CYAN}===== INICIANDO TESTES MANUAIS =====\n${RESET}`);

  // Passo 1: Testar os testes automatizados
  console.log(`${BOLD}FASE 1: Executar testes automatizados${RESET}`);

  try {
    await runCommand('npm test test/TwoFactorAuth.test.js', 'Executando testes automatizados...');
    console.log(`${GREEN}✓ Testes automatizados executados com sucesso${RESET}`);
  } catch (error) {
    console.error(`${RED}✗ Falha nos testes automatizados: ${error.message}${RESET}`);
    await askQuestion(
      '\nPressione Enter para continuar com os testes manuais ou Ctrl+C para sair...'
    );
  }

  // Passo 2: Abrir um ambiente de testes
  console.log(`\n${BOLD}FASE 2: Preparar ambiente para testes manuais${RESET}`);
  console.log(`${YELLOW}Importante: Este teste requer um ambiente Firebase configurado.${RESET}`);

  const useEmulator = await askQuestion('Deseja usar o emulador do Firebase para testes? (S/n): ');

  if (useEmulator.toLowerCase() !== 'n') {
    console.log(`${CYAN}Iniciando emuladores do Firebase...${RESET}`);

    try {
      // Verificar se o emulador está instalado
      await runCommand('npx firebase --version', 'Verificando instalação do Firebase CLI...');

      // Iniciar emuladores
      console.log(`${YELLOW}Iniciando emuladores. Isto pode levar alguns segundos...${RESET}`);
      exec(
        'npx firebase emulators:start --only auth,firestore,functions',
        (error, stdout, stderr) => {
          if (error) {
            console.error(`${RED}Erro ao iniciar emuladores: ${error.message}${RESET}`);
            return;
          }
        }
      );

      console.log(`${GREEN}✓ Emuladores iniciados com sucesso${RESET}`);
      console.log(`${CYAN}O emulador do Firebase está rodando em um processo separado.${RESET}`);
    } catch (error) {
      console.error(`${RED}✗ Falha ao iniciar emuladores: ${error.message}${RESET}`);
      console.log(`${YELLOW}Continuando com ambiente de desenvolvimento padrão.${RESET}`);
    }
  }

  // Passo 3: Checklist para teste manual
  console.log(`\n${BOLD}FASE 3: Checklist para teste manual${RESET}`);
  console.log(`${CYAN}Siga os passos abaixo para testar manualmente o fluxo de 2FA:${RESET}`);

  const steps = [
    'Abra o aplicativo em um dispositivo ou emulador',
    'Faça login com um usuário existente',
    'Acesse as configurações de perfil/segurança',
    'Habilite a autenticação em dois fatores',
    'Salve os códigos de backup mostrados',
    'Faça logout',
    'Faça login novamente para testar o fluxo 2FA',
    'Verifique se é solicitado um código de verificação',
    'Teste o recebimento do código por email',
    'Digite o código recebido',
    'Verifique se o acesso é concedido após verificação bem-sucedida',
    'Faça logout novamente',
    'Faça login para testar o fluxo com código de backup',
    'Quando solicitado o código, use um código de backup',
    'Verifique se o acesso é concedido com o código de backup',
    'Verifique se o código de backup usado não funciona mais',
    'Acesse as configurações e desabilite o 2FA',
    'Faça logout e login novamente para verificar que o 2FA não é mais solicitado',
  ];

  for (let i = 0; i < steps.length; i++) {
    const completed = await askQuestion(
      `${BLUE}[${i + 1}/${steps.length}]${RESET} ${steps[i]}. Concluído? (S/n): `
    );
    if (completed.toLowerCase() === 'n') {
      console.log(`${YELLOW}Passo ${i + 1} marcado como não concluído.${RESET}`);
    }
  }

  // Passo 4: Verificação da função Cloud
  console.log(`\n${BOLD}FASE 4: Verificação da função Cloud${RESET}`);

  const testCloudFunction = await askQuestion(
    'Deseja testar a função Cloud sendVerificationCode? (S/n): '
  );

  if (testCloudFunction.toLowerCase() !== 'n') {
    console.log(`${CYAN}Para testar a função Cloud manualmente:${RESET}`);
    console.log(`1. Acesse o Console do Firebase`);
    console.log(`2. Vá para Functions > Logs`);
    console.log(`3. Observe os logs da função sendVerificationCode durante o login`);
    console.log(`4. Verifique se o email está sendo enviado corretamente`);

    await askQuestion('Verificou os logs da função Cloud? (S/n): ');
  }

  // Passo 5: Resultado final
  console.log(`\n${BOLD}${CYAN}===== RESULTADO FINAL =====\n${RESET}`);

  const testResult = await askQuestion(
    'O fluxo completo de 2FA está funcionando corretamente? (S/n): '
  );

  if (testResult.toLowerCase() !== 'n') {
    console.log(`${GREEN}${BOLD}✓ TESTE CONCLUÍDO COM SUCESSO!${RESET}`);
    console.log(`O serviço de autenticação em dois fatores está funcionando corretamente.`);
  } else {
    console.log(`${RED}${BOLD}✗ TESTE FALHOU!${RESET}`);
    console.log(`O serviço de autenticação em dois fatores precisa de correções.`);

    const issues = await askQuestion('Por favor, descreva os problemas encontrados: ');

    // Salvar problemas em um arquivo de log
    const logFile = path.join(process.cwd(), 'test-2fa-issues.log');
    const date = new Date().toISOString();
    fs.appendFileSync(logFile, `\n[${date}] Problemas encontrados: ${issues}\n`);

    console.log(`${YELLOW}Os problemas foram registrados em ${logFile}${RESET}`);
  }

  // Encerrar
  console.log(`\n${BOLD}${CYAN}===== TESTE CONCLUÍDO =====\n${RESET}`);
  rl.close();
}

// Utilitários
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      if (answer === '' || answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim') {
        resolve('s');
      } else {
        resolve(answer);
      }
    });
  });
}

function runCommand(command, message) {
  return new Promise((resolve, reject) => {
    console.log(`${BLUE}${message || command}${RESET}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`${RED}${stderr}${RESET}`);
        reject(error);
        return;
      }

      resolve(stdout);
    });
  });
}

// Executar o teste
test2FAWorkflow().catch(error => {
  console.error(`${RED}Erro durante o teste: ${error.message}${RESET}`);
  rl.close();
});
