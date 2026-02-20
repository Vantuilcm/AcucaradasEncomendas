#!/usr/bin/env node

/**
 * Script de pré-commit para o projeto Acucaradas Encomendas
 * 
 * Este script executa verificações de segurança antes de cada commit,
 * garantindo que problemas de segurança sejam identificados antes de
 * serem enviados para o repositório.
 * 
 * Para instalar, adicione ao package.json:
 * "husky": {
 *   "hooks": {
 *     "pre-commit": "node ./scripts/pre-commit.js"
 *   }
 * }
 */

const { execSync } = require('child_process');
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

// Configurações
const config = {
  // Verificações a serem executadas
  checks: {
    dependencies: true,   // Verificar vulnerabilidades em dependências
    linting: true,        // Executar linting
    typecheck: true,      // Verificar tipos (TypeScript)
    tests: false,         // Executar testes (desativado por padrão para commits rápidos)
  },
  // Nível mínimo de severidade para falhar o commit
  failOnSeverity: 'high',
  // Arquivos a serem ignorados
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '**/*.min.js',
  ],
};

/**
 * Função principal que executa todas as verificações
 */
async function runPreCommitChecks() {
  console.log(colors.highlight('\n=== VERIFICAÇÕES DE PRÉ-COMMIT ===\n'));
  
  try {
    // Obter arquivos modificados
    const stagedFiles = getStagedFiles();
    console.log(colors.info(`Arquivos modificados: ${stagedFiles.length}`));
    
    // Executar verificações
    let success = true;
    
    if (config.checks.linting) {
      success = success && await runLinting(stagedFiles);
    }
    
    if (config.checks.typecheck) {
      success = success && await runTypecheck();
    }
    
    if (config.checks.dependencies) {
      success = success && await runDependencyCheck();
    }
    
    if (config.checks.tests) {
      success = success && await runTests();
    }
    
    // Verificar se todas as verificações passaram
    if (success) {
      console.log(colors.success('\n✅ Todas as verificações passaram! Commit permitido.\n'));
      process.exit(0);
    } else {
      console.error(colors.error('\n❌ Algumas verificações falharam! Commit bloqueado.\n'));
      console.error(colors.error('Por favor, corrija os problemas acima antes de fazer o commit.'));
      process.exit(1);
    }
  } catch (error) {
    console.error(colors.error(`\n❌ Erro durante as verificações: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Obtém a lista de arquivos modificados no staging
 * @returns {Array<string>} Lista de arquivos modificados
 */
function getStagedFiles() {
  try {
    const result = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return result.split('\n')
      .filter(file => file.trim() !== '')
      .filter(file => !config.ignorePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(file);
      }));
  } catch (error) {
    console.error(colors.error(`Erro ao obter arquivos modificados: ${error.message}`));
    return [];
  }
}

/**
 * Executa o linting nos arquivos modificados
 * @param {Array<string>} files - Lista de arquivos modificados
 * @returns {boolean} Verdadeiro se o linting passar
 */
async function runLinting(files) {
  console.log(colors.highlight('\n=== Executando linting ===\n'));
  
  // Filtrar apenas arquivos JavaScript/TypeScript
  const jsFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.js', '.jsx', '.ts', '.tsx'].includes(ext);
  });
  
  if (jsFiles.length === 0) {
    console.log(colors.info('Nenhum arquivo JavaScript/TypeScript modificado. Pulando linting.'));
    return true;
  }
  
  try {
    // Executar ESLint
    const eslintCommand = `npx eslint ${jsFiles.join(' ')} --max-warnings=0`;
    execSync(eslintCommand, { stdio: 'inherit' });
    
    console.log(colors.success('✅ Linting passou!'));
    return true;
  } catch (error) {
    console.error(colors.error('❌ Linting falhou!'));
    return false;
  }
}

/**
 * Executa a verificação de tipos (TypeScript)
 * @returns {boolean} Verdadeiro se a verificação passar
 */
async function runTypecheck() {
  console.log(colors.highlight('\n=== Executando verificação de tipos ===\n'));
  
  // Verificar se o projeto usa TypeScript
  if (!fs.existsSync('tsconfig.json')) {
    console.log(colors.info('TypeScript não configurado. Pulando verificação de tipos.'));
    return true;
  }
  
  try {
    // Executar TypeScript Compiler em modo de verificação
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    
    console.log(colors.success('✅ Verificação de tipos passou!'));
    return true;
  } catch (error) {
    console.error(colors.error('❌ Verificação de tipos falhou!'));
    return false;
  }
}

/**
 * Executa a verificação de dependências
 * @returns {boolean} Verdadeiro se a verificação passar
 */
async function runDependencyCheck() {
  console.log(colors.highlight('\n=== Executando verificação de dependências ===\n'));
  
  try {
    // Verificar se o script de verificação de dependências existe
    const dependencyCheckScript = path.join(__dirname, 'dependency-check.js');
    
    if (fs.existsSync(dependencyCheckScript)) {
      // Executar o script de verificação de dependências
      execSync(`node ${dependencyCheckScript}`, { stdio: 'inherit' });
    } else {
      // Executar verificação básica de dependências
      const packageManager = getPackageManager();
      execSync(`${packageManager} audit --audit-level=${config.failOnSeverity}`, { stdio: 'inherit' });
    }
    
    console.log(colors.success('✅ Verificação de dependências passou!'));
    return true;
  } catch (error) {
    console.error(colors.error('❌ Verificação de dependências falhou!'));
    console.error(colors.error('Existem vulnerabilidades que precisam ser corrigidas.'));
    return false;
  }
}

/**
 * Executa os testes
 * @returns {boolean} Verdadeiro se os testes passarem
 */
async function runTests() {
  console.log(colors.highlight('\n=== Executando testes ===\n'));
  
  try {
    // Executar testes
    execSync('npm test -- --bail', { stdio: 'inherit' });
    
    console.log(colors.success('✅ Testes passaram!'));
    return true;
  } catch (error) {
    console.error(colors.error('❌ Testes falharam!'));
    return false;
  }
}

/**
 * Verifica se o PNPM está instalado, caso contrário usa NPM
 * @returns {string} O gerenciador de pacotes a ser usado
 */
function getPackageManager() {
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return 'pnpm';
  } catch (error) {
    return 'npm';
  }
}

// Executar verificações
runPreCommitChecks().catch(error => {
  console.error(colors.error(`Erro fatal: ${error.message}`));
  process.exit(1);
});