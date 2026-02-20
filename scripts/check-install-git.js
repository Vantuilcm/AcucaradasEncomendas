/**
 * Script para verificar e orientar a instalação do Git
 * Este script verifica se o Git está instalado no sistema e, caso não esteja,
 * fornece instruções sobre como instalá-lo.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Exibe uma mensagem formatada no console
 * @param {string} message - A mensagem a ser exibida
 * @param {string} type - O tipo de mensagem (info, success, error, warning)
 */
function logMessage(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  let color;

  switch (type) {
    case 'success':
      color = colors.green;
      prefix = '✓';
      break;
    case 'error':
      color = colors.red;
      prefix = '✗';
      break;
    case 'warning':
      color = colors.yellow;
      prefix = '⚠';
      break;
    default:
      color = colors.blue;
      prefix = 'ℹ';
  }

  console.log(`${color}${prefix} ${timestamp} - ${message}${colors.reset}`);
}

/**
 * Verifica se o Git está instalado
 * @returns {Promise<boolean>} - Retorna true se Git estiver instalado, false caso contrário
 */
function checkGitInstalled() {
  return new Promise(resolve => {
    exec('git --version', error => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Obtém a versão do Git instalado
 * @returns {Promise<string>} - A versão do Git ou uma string vazia se não instalado
 */
function getGitVersion() {
  return new Promise(resolve => {
    exec('git --version', (error, stdout) => {
      if (error) {
        resolve('');
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/**
 * Detecta o sistema operacional e fornece instruções específicas
 */
function provideInstallationInstructions() {
  const platform = os.platform();
  const guideFilePath = path.join(process.cwd(), 'GUIA_INSTALACAO_GIT.md');

  logMessage('Git não foi encontrado no seu sistema!', 'error');

  // Verifica se o guia de instalação existe
  if (fs.existsSync(guideFilePath)) {
    logMessage(`Um guia detalhado está disponível em: ${guideFilePath}`, 'info');
    logMessage(
      `Execute 'cat GUIA_INSTALACAO_GIT.md' ou abra o arquivo no seu editor para instruções detalhadas.`,
      'info'
    );
  }

  // Instruções específicas para cada sistema operacional
  if (platform === 'win32') {
    logMessage('\nPara instalar o Git no Windows:', 'info');
    logMessage('1. Baixe o instalador em https://git-scm.com/download/win', 'info');
    logMessage('2. Execute o instalador e siga as instruções na tela', 'info');
    logMessage('3. Após a instalação, reinicie o terminal ou prompt de comando', 'info');
  } else if (platform === 'darwin') {
    logMessage('\nPara instalar o Git no macOS:', 'info');
    logMessage('1. Instale o Homebrew se ainda não tiver (https://brew.sh)', 'info');
    logMessage('2. Execute: brew install git', 'info');
    logMessage('3. Ou baixe em https://git-scm.com/download/mac', 'info');
  } else if (platform === 'linux') {
    logMessage('\nPara instalar o Git no Linux:', 'info');
    logMessage('Para Ubuntu/Debian: sudo apt-get update && sudo apt-get install git', 'info');
    logMessage('Para Fedora: sudo dnf install git', 'info');
    logMessage('Para CentOS/RHEL: sudo yum install git', 'info');
  }

  logMessage(
    '\nApós instalar o Git, execute este script novamente para verificar a instalação.',
    'warning'
  );
}

/**
 * Função principal
 */
async function main() {
  logMessage('Verificando instalação do Git...', 'info');

  const isGitInstalled = await checkGitInstalled();

  if (isGitInstalled) {
    const gitVersion = await getGitVersion();
    logMessage(`Git está instalado corretamente! Versão: ${gitVersion}`, 'success');
    logMessage(
      'Sua configuração está pronta para usar o EAS (Expo Application Services).',
      'success'
    );
  } else {
    provideInstallationInstructions();
    process.exit(1);
  }
}

// Executar a função principal
main();
