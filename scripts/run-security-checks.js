#!/usr/bin/env node

/**
 * Script para executar todas as verificações de segurança
 * 
 * Este script executa todas as verificações de segurança implementadas
 * e gera um relatório consolidado.
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
  // Diretório para relatórios
  reportDir: './security-reports',
  // Nome do arquivo de relatório consolidado
  reportFile: 'security-report.json',
  // Verificações a serem executadas
  checks: [
    {
      name: 'Verificação de Dependências',
      command: 'node ./scripts/dependency-check.js',
      enabled: true,
    },
    {
      name: 'Auditoria de Segurança',
      command: 'node ./scripts/security-audit.js',
      enabled: true,
    },
    {
      name: 'Verificação de Segurança do Servidor',
      command: 'node ./scripts/server-security-check.js',
      enabled: true,
    },
    {
      name: 'Verificação de Segurança Mobile',
      command: 'node ./scripts/mobile-security-check.js',
      enabled: true,
    },
    {
      name: 'Logging e Monitoramento de Segurança',
      command: 'node ./scripts/security-logging.js',
      enabled: true,
    },
    {
      name: 'Testes de Segurança Automatizados',
      command: 'node ./scripts/security-tests.js',
      enabled: true,
    },
    {
      name: 'Agendamento de Testes de Segurança',
      command: 'node ./scripts/scheduled-security-scan.js --run daily',
      enabled: true,
    },
    {
      name: 'Monitoramento de Segurança em Tempo Real',
      command: 'node ./scripts/security-monitor.js --check',
      enabled: true,
    },
    {
      name: 'Dashboard de Segurança',
      command: 'node -e "const dashboard = require(\'../src/middleware/security-dashboard\'); console.log(\'Dashboard de segurança disponível\')"',
      enabled: true,
    },
    {
      name: 'Verificação de Tipos',
      command: 'npx tsc --noEmit',
      enabled: true,
    },
    {
      name: 'Linting',
      command: 'npx eslint "src/**/*.{js,jsx,ts,tsx}" --max-warnings=0',
      enabled: true,
    },
  ],
};

/**
 * Função principal que executa todas as verificações
 */
async function runSecurityChecks() {
  console.log(colors.highlight('\n=== VERIFICAÇÕES DE SEGURANÇA ===\n'));
  
  // Criar diretório de relatórios se não existir
  if (!fs.existsSync(config.reportDir)) {
    fs.mkdirSync(config.reportDir, { recursive: true });
  }
  
  // Resultados das verificações
  const results = {
    date: new Date().toISOString(),
    checks: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
  };
  
  // Executar verificações
  for (const check of config.checks) {
    if (!check.enabled) {
      console.log(colors.info(`Pulando ${check.name}...`));
      results.checks.push({
        name: check.name,
        status: 'skipped',
        message: 'Verificação desativada nas configurações',
      });
      results.summary.skipped++;
      results.summary.total++;
      continue;
    }
    
    console.log(colors.highlight(`\n=== Executando ${check.name} ===\n`));
    
    try {
      // Executar comando
      const output = execSync(check.command, { encoding: 'utf8' });
      
      console.log(colors.success(`✅ ${check.name} passou!`));
      results.checks.push({
        name: check.name,
        status: 'passed',
        message: 'Verificação passou com sucesso',
        output: output.substring(0, 500) + (output.length > 500 ? '...' : ''), // Limitar tamanho do output
      });
      results.summary.passed++;
      results.summary.total++;
    } catch (error) {
      console.error(colors.error(`❌ ${check.name} falhou!`));
      console.error(error.message);
      
      results.checks.push({
        name: check.name,
        status: 'failed',
        message: error.message,
        output: error.stdout ? (error.stdout.substring(0, 500) + (error.stdout.length > 500 ? '...' : '')) : null,
      });
      results.summary.failed++;
      results.summary.total++;
    }
  }
  
  // Salvar relatório
  fs.writeFileSync(
    path.join(config.reportDir, config.reportFile),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  
  // Exibir resumo
  console.log(colors.highlight('\n=== RESUMO DAS VERIFICAÇÕES ===\n'));
  console.log(`Total: ${results.summary.total}`);
  console.log(colors.success(`Passaram: ${results.summary.passed}`));
  console.log(colors.error(`Falharam: ${results.summary.failed}`));
  console.log(colors.info(`Puladas: ${results.summary.skipped}`));
  
  // Verificar se todas as verificações passaram
  if (results.summary.failed === 0) {
    console.log(colors.success('\n✅ Todas as verificações passaram!\n'));
    return true;
  } else {
    console.error(colors.error('\n❌ Algumas verificações falharam!\n'));
    return false;
  }
}

// Executar verificações
runSecurityChecks().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(colors.error(`Erro fatal: ${error.message}`));
  process.exit(1);
});