#!/usr/bin/env node

/**
 * Script de auditoria de segurança para o projeto Acucaradas Encomendas
 * Este script realiza verificações periódicas de tipagem e dependências
 * para identificar problemas de segurança e qualidade de código
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk'); // Para colorir a saída no terminal

// Configurações
const config = {
  // Diretórios a serem verificados
  directories: ['src'],
  // Extensões de arquivos a serem verificados
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  // Padrões de código problemáticos a serem detectados
  patterns: {
    // Uso de any sem justificativa
    anyType: /: any(?![\s]*\/\/[\s]*justificado)/g,
    // Uso de @ts-ignore sem justificativa
    tsIgnore: /\/\/[\s]*@ts-ignore(?![\s]*\/\/[\s]*justificado)/g,
    // Conversões de tipo potencialmente perigosas
    unsafeCasts: /as any|as unknown/g,
    // Uso de eval (extremamente perigoso)
    eval: /eval\(/g,
    // Uso de innerHTML (pode levar a XSS)
    innerHTML: /\.innerHTML[\s]*=/g,
    // Uso de localStorage sem criptografia
    localStorage: /localStorage\.setItem(?![\s\S]*encrypt)/g,
    // Senhas ou tokens hardcoded
    hardcodedSecrets: /(?:password|token|secret|key)(?:[\s]*:[\s]*|[\s]*=[\s]*)['"][^'"]+['"]/gi,
    // Uso de fetch sem tratamento de erro
    fetchWithoutCatch: /fetch\([^)]+\)(?![\s\S]*\.catch)/g,
    // Uso de console.log em código de produção
    consoleLog: /console\.log\(/g,
  },
  // Dependências que devem ser verificadas quanto a vulnerabilidades
  criticalDependencies: [
    'expo-screen-capture',
    'react-native-reanimated',
    'react-native-webview',
    'react-native-fs',
    'expo-secure-store',
    'crypto-js',
  ],
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
 * Função principal que executa todas as verificações
 */
async function runSecurityAudit() {
  console.log(colors.highlight('\n=== AUDITORIA DE SEGURANÇA - ACUCARADAS ENCOMENDAS ===\n'));
  
  try {
    // Verificar dependências
    await checkDependencies();
    
    // Verificar tipagem
    await checkTypeIssues();
    
    // Verificar padrões de código problemáticos
    await checkCodePatterns();
    
    // Verificar vulnerabilidades conhecidas
    await checkVulnerabilities();
    
    // Verificar configurações de segurança
    await checkSecurityConfigs();
    
    console.log(colors.success('\n✅ Auditoria de segurança concluída!\n'));
  } catch (error) {
    console.error(colors.error(`\n❌ Erro durante a auditoria: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Verifica problemas de tipagem usando o TypeScript Compiler
 */
async function checkTypeIssues() {
  console.log(colors.highlight('\n=== Verificando problemas de tipagem ===\n'));
  
  try {
    // Executar o TypeScript Compiler em modo de verificação
    const result = execSync('npx tsc --noEmit', { encoding: 'utf8' });
    console.log(colors.success('✅ Nenhum problema de tipagem encontrado!'));
  } catch (error) {
    // O TypeScript Compiler retorna erro se encontrar problemas de tipagem
    console.log(colors.error('❌ Problemas de tipagem encontrados:'));
    console.log(error.stdout);
    
    // Extrair e mostrar os erros mais comuns
    const errorLines = error.stdout.split('\n');
    const errorTypes = {};
    
    errorLines.forEach(line => {
      if (line.includes('error TS')) {
        const errorCode = line.match(/TS\d+/);
        if (errorCode) {
          errorTypes[errorCode[0]] = (errorTypes[errorCode[0]] || 0) + 1;
        }
      }
    });
    
    console.log(colors.warning('\nErros mais comuns:'));
    Object.entries(errorTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        console.log(`${colors.warning(code)}: ${count} ocorrências`);
      });
  }
}

/**
 * Verifica dependências críticas
 */
async function checkDependencies() {
  console.log(colors.highlight('\n=== Verificando dependências críticas ===\n'));
  
  try {
    // Ler o package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Verificar dependências críticas
    const missingDeps = [];
    config.criticalDependencies.forEach(dep => {
      if (!dependencies[dep]) {
        missingDeps.push(dep);
      }
    });
    
    if (missingDeps.length > 0) {
      console.log(colors.warning(`⚠️ Dependências críticas ausentes: ${missingDeps.join(', ')}`));
    } else {
      console.log(colors.success('✅ Todas as dependências críticas estão instaladas!'));
    }
    
    // Verificar versões desatualizadas
    console.log(colors.info('\nVerificando atualizações de dependências...'));
    const outdated = execSync('npm outdated --json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    
    if (outdated && outdated.trim() !== '') {
      const outdatedDeps = JSON.parse(outdated);
      const outdatedCount = Object.keys(outdatedDeps).length;
      
      if (outdatedCount > 0) {
        console.log(colors.warning(`⚠️ ${outdatedCount} dependências desatualizadas encontradas.`));
        
        // Destacar dependências críticas desatualizadas
        const criticalOutdated = Object.keys(outdatedDeps)
          .filter(dep => config.criticalDependencies.includes(dep));
        
        if (criticalOutdated.length > 0) {
          console.log(colors.error(`❌ Dependências críticas desatualizadas: ${criticalOutdated.join(', ')}`));
          console.log(colors.info('Execute npm update para atualizar as dependências.'));
        }
      } else {
        console.log(colors.success('✅ Todas as dependências estão atualizadas!'));
      }
    } else {
      console.log(colors.success('✅ Todas as dependências estão atualizadas!'));
    }
  } catch (error) {
    console.error(colors.error(`Erro ao verificar dependências: ${error.message}`));
  }
}

/**
 * Verifica padrões de código problemáticos
 */
async function checkCodePatterns() {
  console.log(colors.highlight('\n=== Verificando padrões de código problemáticos ===\n'));
  
  const issues = [];
  const filesChecked = 0;
  
  // Função recursiva para verificar arquivos em um diretório
  function checkDirectory(directory) {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
        // Recursivamente verificar subdiretórios
        checkDirectory(filePath);
      } else if (stats.isFile() && config.extensions.includes(path.extname(file))) {
        // Verificar arquivo se tiver uma extensão relevante
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Verificar cada padrão problemático
        Object.entries(config.patterns).forEach(([name, pattern]) => {
          const matches = content.match(pattern);
          if (matches) {
            issues.push({
              file: filePath,
              pattern: name,
              count: matches.length,
            });
          }
        });
      }
    });
  }
  
  // Iniciar verificação em cada diretório configurado
  config.directories.forEach(dir => {
    checkDirectory(dir);
  });
  
  // Exibir resultados
  if (issues.length > 0) {
    console.log(colors.warning(`⚠️ ${issues.length} problemas encontrados em padrões de código:`));
    
    // Agrupar por tipo de problema
    const issuesByPattern = {};
    issues.forEach(issue => {
      if (!issuesByPattern[issue.pattern]) {
        issuesByPattern[issue.pattern] = [];
      }
      issuesByPattern[issue.pattern].push(issue);
    });
    
    // Exibir problemas agrupados
    Object.entries(issuesByPattern).forEach(([pattern, patternIssues]) => {
      const totalCount = patternIssues.reduce((sum, issue) => sum + issue.count, 0);
      console.log(colors.warning(`\n${pattern}: ${totalCount} ocorrências em ${patternIssues.length} arquivos`));
      
      // Mostrar os 5 arquivos com mais problemas
      patternIssues
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .forEach(issue => {
          console.log(`  ${issue.file}: ${issue.count} ocorrências`);
        });
    });
  } else {
    console.log(colors.success('✅ Nenhum padrão de código problemático encontrado!'));
  }
}

/**
 * Verifica vulnerabilidades conhecidas usando npm audit
 */
async function checkVulnerabilities() {
  console.log(colors.highlight('\n=== Verificando vulnerabilidades conhecidas ===\n'));
  
  try {
    const audit = execSync('npm audit --json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const auditData = JSON.parse(audit);
    
    if (auditData.vulnerabilities) {
      const vulnCount = Object.values(auditData.vulnerabilities).length;
      
      if (vulnCount > 0) {
        // Contar vulnerabilidades por severidade
        const severityCounts = {
          critical: 0,
          high: 0,
          moderate: 0,
          low: 0,
        };
        
        Object.values(auditData.vulnerabilities).forEach(vuln => {
          if (severityCounts[vuln.severity] !== undefined) {
            severityCounts[vuln.severity]++;
          }
        });
        
        console.log(colors.error(`❌ ${vulnCount} vulnerabilidades encontradas:`));
        console.log(colors.error(`   Críticas: ${severityCounts.critical}`));
        console.log(colors.error(`   Altas: ${severityCounts.high}`));
        console.log(colors.warning(`   Moderadas: ${severityCounts.moderate}`));
        console.log(colors.info(`   Baixas: ${severityCounts.low}`));
        
        console.log(colors.info('\nExecute npm audit fix para corrigir vulnerabilidades automáticas.'));
        console.log(colors.info('Para mais detalhes, execute npm audit.'));
      } else {
        console.log(colors.success('✅ Nenhuma vulnerabilidade conhecida encontrada!'));
      }
    } else {
      console.log(colors.success('✅ Nenhuma vulnerabilidade conhecida encontrada!'));
    }
  } catch (error) {
    // npm audit retorna erro se encontrar vulnerabilidades
    try {
      const errorOutput = error.stdout;
      const auditData = JSON.parse(errorOutput);
      
      if (auditData.vulnerabilities) {
        const vulnCount = Object.keys(auditData.vulnerabilities).length;
        
        if (vulnCount > 0) {
          // Contar vulnerabilidades por severidade
          const severityCounts = {
            critical: 0,
            high: 0,
            moderate: 0,
            low: 0,
          };
          
          Object.values(auditData.vulnerabilities).forEach(vuln => {
            if (severityCounts[vuln.severity] !== undefined) {
              severityCounts[vuln.severity]++;
            }
          });
          
          console.log(colors.error(`❌ ${vulnCount} vulnerabilidades encontradas:`));
          console.log(colors.error(`   Críticas: ${severityCounts.critical}`));
          console.log(colors.error(`   Altas: ${severityCounts.high}`));
          console.log(colors.warning(`   Moderadas: ${severityCounts.moderate}`));
          console.log(colors.info(`   Baixas: ${severityCounts.low}`));
          
          console.log(colors.info('\nExecute npm audit fix para corrigir vulnerabilidades automáticas.'));
          console.log(colors.info('Para mais detalhes, execute npm audit.'));
        }
      }
    } catch (parseError) {
      console.error(colors.error(`Erro ao analisar resultados do npm audit: ${parseError.message}`));
    }
  }
}

/**
 * Verifica configurações de segurança
 */
async function checkSecurityConfigs() {
  console.log(colors.highlight('\n=== Verificando configurações de segurança ===\n'));
  
  const securityConfigPath = path.join('src', 'config', 'securityConfig.ts');
  
  if (fs.existsSync(securityConfigPath)) {
    console.log(colors.success('✅ Arquivo de configuração de segurança encontrado!'));
    
    // Verificar conteúdo do arquivo de configuração
    const content = fs.readFileSync(securityConfigPath, 'utf8');
    
    // Verificar configurações importantes
    const checks = [
      { name: 'Proteção contra capturas de tela', pattern: /screenshotProtection.*enabled:\s*true/s },
      { name: 'Marcas d\'água dinâmicas', pattern: /watermark.*enabled:\s*true/s },
      { name: 'Registro de tentativas de captura', pattern: /logAttempts:\s*true/s },
      { name: 'Relatório de eventos de segurança', pattern: /reportToServer:\s*true/s },
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(colors.success(`✅ ${check.name}: Configurado corretamente`));
      } else {
        console.log(colors.warning(`⚠️ ${check.name}: Não configurado ou desativado`));
      }
    });
  } else {
    console.log(colors.error('❌ Arquivo de configuração de segurança não encontrado!'));
    console.log(colors.info(`O arquivo deve estar em: ${securityConfigPath}`));
  }
}

// Executar auditoria
runSecurityAudit();