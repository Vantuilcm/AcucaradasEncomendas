#!/usr/bin/env node

/**
 * Script de verificação de dependências para o projeto Acucaradas Encomendas
 * 
 * Este script realiza verificações de segurança nas dependências do projeto,
 * identificando vulnerabilidades conhecidas e gerando relatórios.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configurações
const config = {
  // Nível mínimo de severidade para falhar o build (low, moderate, high, critical)
  failOnSeverity: 'high',
  // Caminho para o arquivo de relatório
  reportPath: './security-reports',
  // Nome do arquivo de relatório
  reportFile: 'dependency-check-report.json',
  // Dependências a serem ignoradas (temporariamente)
  ignoredDependencies: [],
  // Número máximo de vulnerabilidades permitidas
  maxVulnerabilities: {
    critical: 0,
    high: 0,
    moderate: 5,
    low: 10,
  },
};

// Cores para saída
const colors = {
  error: chalk.bold.red,
  warning: chalk.keyword('orange'),
  info: chalk.blue,
  success: chalk.green,
  highlight: chalk.yellow,
};

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

/**
 * Executa a verificação de dependências
 */
async function checkDependencies() {
  console.log(colors.highlight('\n=== VERIFICAÇÃO DE DEPENDÊNCIAS ===\n'));
  
  // Cria o diretório de relatórios se não existir
  if (!fs.existsSync(config.reportPath)) {
    fs.mkdirSync(config.reportPath, { recursive: true });
  }
  
  const packageManager = getPackageManager();
  console.log(colors.info(`Usando ${packageManager} para verificar dependências...`));
  
  try {
    // Executa o audit e salva o resultado
    const auditCommand = `${packageManager} audit --json`;
    const auditResult = execSync(auditCommand, { encoding: 'utf8' });
    
    // Salva o relatório completo
    fs.writeFileSync(
      path.join(config.reportPath, config.reportFile),
      auditResult,
      'utf8'
    );
    
    // Analisa o resultado
    const vulnerabilities = parseAuditResult(auditResult, packageManager);
    
    // Exibe o resumo
    displaySummary(vulnerabilities);
    
    // Verifica se deve falhar o build
    checkFailConditions(vulnerabilities);
    
    console.log(colors.success('\n✅ Verificação de dependências concluída!\n'));
  } catch (error) {
    console.error(colors.error(`\n❌ Erro durante a verificação: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Analisa o resultado do audit
 * @param {string} auditResult - Resultado do comando audit em formato JSON
 * @param {string} packageManager - Gerenciador de pacotes usado (pnpm ou npm)
 * @returns {Object} Objeto com as vulnerabilidades encontradas
 */
function parseAuditResult(auditResult, packageManager) {
  const result = JSON.parse(auditResult);
  
  // Estrutura para armazenar as vulnerabilidades
  const vulnerabilities = {
    critical: [],
    high: [],
    moderate: [],
    low: [],
    total: 0,
  };
  
  // Diferentes formatos de saída entre npm e pnpm
  if (packageManager === 'pnpm') {
    // Formato do PNPM
    if (result.vulnerabilities) {
      Object.keys(result.vulnerabilities).forEach(pkgName => {
        const vuln = result.vulnerabilities[pkgName];
        const severity = vuln.severity.toLowerCase();
        
        if (vulnerabilities[severity]) {
          vulnerabilities[severity].push({
            name: pkgName,
            version: vuln.range,
            description: vuln.title,
            path: vuln.path,
            fixAvailable: vuln.fixAvailable,
          });
          vulnerabilities.total++;
        }
      });
    }
  } else {
    // Formato do NPM
    if (result.vulnerabilities) {
      Object.keys(result.vulnerabilities).forEach(pkgName => {
        const vuln = result.vulnerabilities[pkgName];
        const severity = vuln.severity.toLowerCase();
        
        if (vulnerabilities[severity]) {
          vulnerabilities[severity].push({
            name: pkgName,
            version: vuln.version,
            description: vuln.title || vuln.url,
            path: vuln.path,
            fixAvailable: vuln.fixAvailable,
          });
          vulnerabilities.total++;
        }
      });
    }
  }
  
  return vulnerabilities;
}

/**
 * Exibe um resumo das vulnerabilidades encontradas
 * @param {Object} vulnerabilities - Objeto com as vulnerabilidades encontradas
 */
function displaySummary(vulnerabilities) {
  console.log(colors.highlight('\n=== RESUMO DE VULNERABILIDADES ===\n'));
  
  console.log(colors.error(`Críticas: ${vulnerabilities.critical.length}`));
  console.log(colors.warning(`Altas: ${vulnerabilities.high.length}`));
  console.log(colors.info(`Moderadas: ${vulnerabilities.moderate.length}`));
  console.log(colors.info(`Baixas: ${vulnerabilities.low.length}`));
  console.log(colors.highlight(`Total: ${vulnerabilities.total}`));
  
  // Exibe detalhes das vulnerabilidades críticas e altas
  if (vulnerabilities.critical.length > 0) {
    console.log(colors.error('\n=== VULNERABILIDADES CRÍTICAS ===\n'));
    vulnerabilities.critical.forEach(vuln => {
      console.log(colors.error(`- ${vuln.name}@${vuln.version}: ${vuln.description}`));
      console.log(`  Caminho: ${vuln.path}`);
      console.log(`  Correção disponível: ${vuln.fixAvailable ? 'Sim' : 'Não'}`);
    });
  }
  
  if (vulnerabilities.high.length > 0) {
    console.log(colors.warning('\n=== VULNERABILIDADES ALTAS ===\n'));
    vulnerabilities.high.forEach(vuln => {
      console.log(colors.warning(`- ${vuln.name}@${vuln.version}: ${vuln.description}`));
      console.log(`  Caminho: ${vuln.path}`);
      console.log(`  Correção disponível: ${vuln.fixAvailable ? 'Sim' : 'Não'}`);
    });
  }
  
  // Salva o relatório em formato mais amigável
  const reportSummary = {
    date: new Date().toISOString(),
    summary: {
      critical: vulnerabilities.critical.length,
      high: vulnerabilities.high.length,
      moderate: vulnerabilities.moderate.length,
      low: vulnerabilities.low.length,
      total: vulnerabilities.total,
    },
    vulnerabilities: {
      critical: vulnerabilities.critical,
      high: vulnerabilities.high,
      moderate: vulnerabilities.moderate,
      low: vulnerabilities.low,
    },
  };
  
  fs.writeFileSync(
    path.join(config.reportPath, 'dependency-summary.json'),
    JSON.stringify(reportSummary, null, 2),
    'utf8'
  );
}

/**
 * Verifica se deve falhar o build com base nas vulnerabilidades encontradas
 * @param {Object} vulnerabilities - Objeto com as vulnerabilidades encontradas
 */
function checkFailConditions(vulnerabilities) {
  const severityLevels = ['low', 'moderate', 'high', 'critical'];
  const failLevel = severityLevels.indexOf(config.failOnSeverity);
  
  let shouldFail = false;
  let failReason = '';
  
  // Verifica se há vulnerabilidades acima do nível configurado
  severityLevels.forEach((level, index) => {
    if (index >= failLevel && vulnerabilities[level].length > config.maxVulnerabilities[level]) {
      shouldFail = true;
      failReason = `Número de vulnerabilidades ${level} (${vulnerabilities[level].length}) excede o máximo permitido (${config.maxVulnerabilities[level]})`;
    }
  });
  
  if (shouldFail) {
    console.error(colors.error(`\n❌ FALHA NA VERIFICAÇÃO: ${failReason}\n`));
    console.error(colors.error('A verificação de dependências falhou devido a vulnerabilidades de segurança.'));
    console.error(colors.error('Por favor, atualize as dependências afetadas ou ajuste as configurações.'));
    process.exit(1);
  }
}

// Executa a verificação
checkDependencies().catch(error => {
  console.error(colors.error(`Erro fatal: ${error.message}`));
  process.exit(1);
});