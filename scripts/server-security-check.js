#!/usr/bin/env node

/**
 * Script para verificar a configuração de segurança do servidor Express
 * 
 * Este script analisa a configuração do servidor para garantir que
 * todas as medidas de segurança recomendadas estão implementadas.
 */

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

// Verificações de segurança para o servidor
const securityChecks = [
  {
    name: 'Content-Security-Policy',
    description: 'Previne ataques XSS definindo origens confiáveis',
    pattern: /Content-Security-Policy/i,
    required: true,
    recommendation: 'Implementar Content-Security-Policy nos headers HTTP',
  },
  {
    name: 'X-Content-Type-Options',
    description: 'Previne MIME-sniffing',
    pattern: /X-Content-Type-Options:\s*nosniff/i,
    required: true,
    recommendation: 'Adicionar X-Content-Type-Options: nosniff aos headers HTTP',
  },
  {
    name: 'X-Frame-Options',
    description: 'Previne clickjacking',
    pattern: /X-Frame-Options:\s*(DENY|SAMEORIGIN)/i,
    required: true,
    recommendation: 'Adicionar X-Frame-Options: DENY aos headers HTTP',
  },
  {
    name: 'Strict-Transport-Security',
    description: 'Força conexões HTTPS',
    pattern: /Strict-Transport-Security/i,
    required: true,
    recommendation: 'Implementar HSTS para forçar conexões HTTPS',
  },
  {
    name: 'X-XSS-Protection',
    description: 'Proteção adicional contra XSS em navegadores antigos',
    pattern: /X-XSS-Protection:\s*1;\s*mode=block/i,
    required: true,
    recommendation: 'Adicionar X-XSS-Protection: 1; mode=block aos headers HTTP',
  },
  {
    name: 'CORS configurado',
    description: 'Configuração adequada de CORS',
    pattern: /cors\(|Access-Control-Allow-Origin/i,
    required: true,
    recommendation: 'Configurar CORS corretamente para restringir origens',
  },
  {
    name: 'CSRF Protection',
    description: 'Proteção contra CSRF',
    pattern: /csrf|csurf|csrf-protection/i,
    required: true,
    recommendation: 'Implementar proteção CSRF para requisições POST/PUT/DELETE',
  },
  {
    name: 'Helmet',
    description: 'Uso do pacote Helmet para segurança',
    pattern: /helmet|security-headers/i,
    required: false,
    recommendation: 'Considerar o uso do pacote Helmet para simplificar a configuração de headers de segurança',
  },
  {
    name: 'Rate Limiting',
    description: 'Limitação de taxa para prevenir ataques de força bruta',
    pattern: /rate-limit|rateLimit|limiter/i,
    required: false,
    recommendation: 'Implementar rate limiting para prevenir ataques de força bruta',
  },
];

/**
 * Verifica a configuração de segurança do servidor
 */
async function checkServerSecurity() {
  console.log(colors.highlight('\n=== VERIFICAÇÃO DE SEGURANÇA DO SERVIDOR ===\n'));
  
  // Arquivos a serem verificados
  const filesToCheck = [
    path.resolve('./server.js'),
    path.resolve('./src/utils/security-headers.js'),
    path.resolve('./src/utils/csrf-protection.js'),
  ];
  
  // Resultados das verificações
  const results = {
    date: new Date().toISOString(),
    checks: [],
    summary: {
      total: securityChecks.length,
      passed: 0,
      failed: 0,
      warning: 0,
    },
  };
  
  // Conteúdo combinado de todos os arquivos
  let combinedContent = '';
  
  // Ler conteúdo dos arquivos
  for (const filePath of filesToCheck) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        combinedContent += content;
        console.log(colors.info(`Analisando ${path.basename(filePath)}...`));
      }
    } catch (error) {
      console.error(colors.error(`Erro ao ler ${filePath}: ${error.message}`));
    }
  }
  
  // Executar verificações
  for (const check of securityChecks) {
    const passed = check.pattern.test(combinedContent);
    
    if (passed) {
      console.log(colors.success(`✅ ${check.name}: Implementado`));
      results.checks.push({
        name: check.name,
        status: 'passed',
        description: check.description,
      });
      results.summary.passed++;
    } else if (check.required) {
      console.log(colors.error(`❌ ${check.name}: Não implementado (Obrigatório)`));
      console.log(colors.info(`   Recomendação: ${check.recommendation}`));
      results.checks.push({
        name: check.name,
        status: 'failed',
        description: check.description,
        recommendation: check.recommendation,
      });
      results.summary.failed++;
    } else {
      console.log(colors.warning(`⚠️ ${check.name}: Não implementado (Recomendado)`));
      console.log(colors.info(`   Recomendação: ${check.recommendation}`));
      results.checks.push({
        name: check.name,
        status: 'warning',
        description: check.description,
        recommendation: check.recommendation,
      });
      results.summary.warning++;
    }
  }
  
  // Exibir resumo
  console.log(colors.highlight('\n=== RESUMO DA VERIFICAÇÃO ===\n'));
  console.log(`Total: ${results.summary.total}`);
  console.log(colors.success(`Passaram: ${results.summary.passed}`));
  console.log(colors.error(`Falharam: ${results.summary.failed}`));
  console.log(colors.warning(`Avisos: ${results.summary.warning}`));
  
  // Verificar se todas as verificações obrigatórias passaram
  if (results.summary.failed === 0) {
    console.log(colors.success('\n✅ Todas as verificações obrigatórias passaram!\n'));
    return true;
  } else {
    console.error(colors.error('\n❌ Algumas verificações obrigatórias falharam!\n'));
    return false;
  }
}

// Executar verificação
checkServerSecurity().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(colors.error(`Erro fatal: ${error.message}`));
  process.exit(1);
});