/**
 * Script de Testes de Segurança Automatizados
 * 
 * Este script implementa testes de segurança automatizados para integração com CI/CD, incluindo:
 * - Testes de penetração básicos
 * - Análise estática de código para vulnerabilidades
 * - Verificação de configurações de segurança
 * - Validação de headers HTTP de segurança
 * 
 * Implementado seguindo as recomendações OWASP e NIST.
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const axios = require('axios');
const chalk = require('chalk');

// Configurações
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const REPORT_DIR = process.env.REPORT_DIR || 'reports/security';
const ENDPOINTS_TO_TEST = [
  '/',
  '/api/auth/login',
  '/api/products',
  '/api/users',
  '/api/orders'
];

// Garantir que o diretório de relatórios exista
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Resultados dos testes
const testResults = {
  staticAnalysis: [],
  penetrationTests: [],
  configTests: [],
  headerTests: [],
  dependencyTests: [],
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0,
    critical: 0
  }
};

/**
 * Executa todos os testes de segurança
 */
async function runAllSecurityTests() {
  console.log(chalk.blue.bold('🔒 Iniciando testes de segurança automatizados'));
  console.log(chalk.blue('='.repeat(50)));
  
  try {
    // Executar testes em paralelo
    await Promise.all([
      runStaticCodeAnalysis(),
      runDependencyChecks(),
      runConfigurationTests()
    ]);
    
    // Executar testes que dependem do servidor estar rodando
    if (await isServerRunning()) {
      await Promise.all([
        runPenetrationTests(),
        runSecurityHeaderTests()
      ]);
    } else {
      console.log(chalk.yellow('⚠️ Servidor não está rodando. Testes de penetração e headers HTTP serão ignorados.'));
    }
    
    // Gerar relatório final
    generateFinalReport();
    
    // Retornar código de saída baseado nos resultados
    return testResults.summary.critical > 0 ? 1 : 0;
    
  } catch (error) {
    console.error(chalk.red('❌ Erro ao executar testes de segurança:'), error);
    return 1;
  }
}

/**
 * Executa análise estática de código para identificar vulnerabilidades
 */
async function runStaticCodeAnalysis() {
  console.log(chalk.blue('🔍 Executando análise estática de código...'));
  
  try {
    // Verificar se o ESLint está instalado com plugins de segurança
    const hasEslintSecurity = checkForEslintSecurityPlugins();
    
    if (hasEslintSecurity) {
      // Executar ESLint com regras de segurança
      console.log('Executando ESLint com regras de segurança...');
      try {
        const eslintOutput = execSync('npx eslint --ext .js,.jsx,.ts,.tsx src/ --no-error-on-unmatched-pattern').toString();
        testResults.staticAnalysis.push({
          name: 'ESLint Security',
          status: 'passed',
          details: 'Nenhum problema de segurança encontrado via ESLint'
        });
        testResults.summary.passed++;
      } catch (error) {
        // ESLint encontrou problemas
        const output = error.stdout.toString();
        const securityIssues = extractSecurityIssuesFromEslint(output);
        
        if (securityIssues.length > 0) {
          testResults.staticAnalysis.push({
            name: 'ESLint Security',
            status: 'failed',
            details: `${securityIssues.length} problemas de segurança encontrados`,
            issues: securityIssues
          });
          testResults.summary.failed++;
          
          // Salvar relatório detalhado
          fs.writeFileSync(
            path.join(REPORT_DIR, 'eslint-security-issues.json'),
            JSON.stringify(securityIssues, null, 2)
          );
        } else {
          // Problemas de lint, mas não de segurança
          testResults.staticAnalysis.push({
            name: 'ESLint Security',
            status: 'passed',
            details: 'Problemas de lint encontrados, mas nenhum relacionado à segurança'
          });
          testResults.summary.passed++;
        }
      }
    } else {
      // Recomendar instalação de plugins de segurança
      testResults.staticAnalysis.push({
        name: 'ESLint Security',
        status: 'warning',
        details: 'Plugins de segurança do ESLint não encontrados. Considere instalar eslint-plugin-security.'
      });
      testResults.summary.warnings++;
    }
    
    // Verificar padrões de segurança no código
    console.log('Verificando padrões de segurança no código...');
    const securityPatterns = checkSecurityPatterns();
    
    if (securityPatterns.issues.length > 0) {
      testResults.staticAnalysis.push({
        name: 'Security Patterns',
        status: securityPatterns.hasCritical ? 'critical' : 'failed',
        details: `${securityPatterns.issues.length} padrões de código inseguros encontrados`,
        issues: securityPatterns.issues
      });
      
      if (securityPatterns.hasCritical) {
        testResults.summary.critical++;
      } else {
        testResults.summary.failed++;
      }
      
      // Salvar relatório detalhado
      fs.writeFileSync(
        path.join(REPORT_DIR, 'security-patterns-issues.json'),
        JSON.stringify(securityPatterns.issues, null, 2)
      );
    } else {
      testResults.staticAnalysis.push({
        name: 'Security Patterns',
        status: 'passed',
        details: 'Nenhum padrão de código inseguro encontrado'
      });
      testResults.summary.passed++;
    }
    
  } catch (error) {
    console.error(chalk.red('Erro ao executar análise estática:'), error);
    testResults.staticAnalysis.push({
      name: 'Static Analysis',
      status: 'error',
      details: `Erro ao executar análise estática: ${error.message}`
    });
    testResults.summary.failed++;
  }
}

/**
 * Executa testes de penetração básicos
 */
async function runPenetrationTests() {
  console.log(chalk.blue('🔨 Executando testes de penetração básicos...'));
  
  try {
    // Testar endpoints para vulnerabilidades comuns
    for (const endpoint of ENDPOINTS_TO_TEST) {
      console.log(`Testando endpoint: ${endpoint}`);
      
      // Testar SQL Injection
      const sqlInjectionResult = await testSqlInjection(endpoint);
      testResults.penetrationTests.push(sqlInjectionResult);
      updateSummary(sqlInjectionResult.status);
      
      // Testar XSS
      const xssResult = await testXSS(endpoint);
      testResults.penetrationTests.push(xssResult);
      updateSummary(xssResult.status);
      
      // Testar CSRF
      const csrfResult = await testCSRF(endpoint);
      testResults.penetrationTests.push(csrfResult);
      updateSummary(csrfResult.status);
    }
    
    // Testar rate limiting
    const rateLimitResult = await testRateLimiting('/api/auth/login');
    testResults.penetrationTests.push(rateLimitResult);
    updateSummary(rateLimitResult.status);
    
  } catch (error) {
    console.error(chalk.red('Erro ao executar testes de penetração:'), error);
    testResults.penetrationTests.push({
      name: 'Penetration Tests',
      status: 'error',
      details: `Erro ao executar testes de penetração: ${error.message}`
    });
    testResults.summary.failed++;
  }
}

/**
 * Executa verificações de configurações de segurança
 */
async function runConfigurationTests() {
  console.log(chalk.blue('⚙️ Verificando configurações de segurança...'));
  
  try {
    // Verificar configurações de segurança em arquivos de configuração
    const configFiles = [
      { path: '.env.example', type: 'env' },
      { path: 'src/config/security.js', type: 'js' },
      { path: 'src/config/server.js', type: 'js' },
      { path: 'src/config/auth.js', type: 'js' }
    ];
    
    for (const file of configFiles) {
      if (fs.existsSync(file.path)) {
        const configResult = checkSecurityConfig(file.path, file.type);
        testResults.configTests.push(configResult);
        updateSummary(configResult.status);
      }
    }
    
    // Verificar configurações de CORS
    const corsResult = checkCORSConfig();
    testResults.configTests.push(corsResult);
    updateSummary(corsResult.status);
    
    // Verificar configurações de cookies
    const cookieResult = checkCookieConfig();
    testResults.configTests.push(cookieResult);
    updateSummary(cookieResult.status);
    
  } catch (error) {
    console.error(chalk.red('Erro ao verificar configurações:'), error);
    testResults.configTests.push({
      name: 'Configuration Tests',
      status: 'error',
      details: `Erro ao verificar configurações: ${error.message}`
    });
    testResults.summary.failed++;
  }
}

/**
 * Verifica headers HTTP de segurança
 */
async function runSecurityHeaderTests() {
  console.log(chalk.blue('🔒 Verificando headers HTTP de segurança...'));
  
  try {
    // Testar headers de segurança na resposta do servidor
    const headersToCheck = [
      { name: 'X-Content-Type-Options', value: 'nosniff', required: true },
      { name: 'X-Frame-Options', value: 'DENY', required: true },
      { name: 'X-XSS-Protection', value: '1; mode=block', required: false },
      { name: 'Content-Security-Policy', required: true },
      { name: 'Strict-Transport-Security', required: true },
      { name: 'Referrer-Policy', required: false }
    ];
    
    const response = await axios.get(BASE_URL, { validateStatus: () => true });
    const headers = response.headers;
    
    for (const header of headersToCheck) {
      const headerValue = headers[header.name.toLowerCase()];
      const result = {
        name: `Header: ${header.name}`,
        status: 'failed',
        details: ''
      };
      
      if (headerValue) {
        if (header.value && headerValue !== header.value) {
          result.status = 'warning';
          result.details = `Header presente, mas com valor incorreto. Esperado: ${header.value}, Encontrado: ${headerValue}`;
        } else {
          result.status = 'passed';
          result.details = `Header presente: ${headerValue}`;
        }
      } else if (header.required) {
        result.status = 'failed';
        result.details = `Header obrigatório não encontrado: ${header.name}`;
      } else {
        result.status = 'warning';
        result.details = `Header recomendado não encontrado: ${header.name}`;
      }
      
      testResults.headerTests.push(result);
      updateSummary(result.status);
    }
    
  } catch (error) {
    console.error(chalk.red('Erro ao verificar headers:'), error);
    testResults.headerTests.push({
      name: 'Security Headers',
      status: 'error',
      details: `Erro ao verificar headers: ${error.message}`
    });
    testResults.summary.failed++;
  }
}

/**
 * Executa verificações de dependências
 */
async function runDependencyChecks() {
  console.log(chalk.blue('📦 Verificando dependências...'));
  
  try {
    // Executar npm audit
    console.log('Executando auditoria de dependências...');
    try {
      const auditOutput = execSync('npm audit --json').toString();
      const auditResult = JSON.parse(auditOutput);
      
      const vulnerabilities = auditResult.vulnerabilities || {};
      const totalVulnerabilities = Object.values(vulnerabilities).reduce(
        (sum, severity) => sum + (severity.length || 0),
        0
      );
      
      const hasCritical = auditResult.metadata && 
                         auditResult.metadata.vulnerabilities && 
                         (auditResult.metadata.vulnerabilities.critical > 0 || 
                          auditResult.metadata.vulnerabilities.high > 0);
      
      if (totalVulnerabilities > 0) {
        testResults.dependencyTests.push({
          name: 'Dependency Audit',
          status: hasCritical ? 'critical' : 'warning',
          details: `${totalVulnerabilities} vulnerabilidades encontradas nas dependências`,
          vulnerabilities: auditResult.metadata.vulnerabilities
        });
        
        if (hasCritical) {
          testResults.summary.critical++;
        } else {
          testResults.summary.warnings++;
        }
        
        // Salvar relatório detalhado
        fs.writeFileSync(
          path.join(REPORT_DIR, 'dependency-audit.json'),
          JSON.stringify(auditResult, null, 2)
        );
      } else {
        testResults.dependencyTests.push({
          name: 'Dependency Audit',
          status: 'passed',
          details: 'Nenhuma vulnerabilidade encontrada nas dependências'
        });
        testResults.summary.passed++;
      }
    } catch (error) {
      // Verificar se é um erro de execução ou se encontrou vulnerabilidades
      if (error.stdout) {
        try {
          const auditResult = JSON.parse(error.stdout.toString());
          
          const vulnerabilities = auditResult.metadata.vulnerabilities;
          const totalVulnerabilities = Object.values(vulnerabilities).reduce(
            (sum, count) => sum + count,
            0
          );
          
          const hasCritical = vulnerabilities.critical > 0 || vulnerabilities.high > 0;
          
          testResults.dependencyTests.push({
            name: 'Dependency Audit',
            status: hasCritical ? 'critical' : 'warning',
            details: `${totalVulnerabilities} vulnerabilidades encontradas nas dependências`,
            vulnerabilities
          });
          
          if (hasCritical) {
            testResults.summary.critical++;
          } else {
            testResults.summary.warnings++;
          }
          
          // Salvar relatório detalhado
          fs.writeFileSync(
            path.join(REPORT_DIR, 'dependency-audit.json'),
            JSON.stringify(auditResult, null, 2)
          );
        } catch (parseError) {
          testResults.dependencyTests.push({
            name: 'Dependency Audit',
            status: 'error',
            details: `Erro ao analisar resultado da auditoria: ${parseError.message}`
          });
          testResults.summary.failed++;
        }
      } else {
        testResults.dependencyTests.push({
          name: 'Dependency Audit',
          status: 'error',
          details: `Erro ao executar auditoria de dependências: ${error.message}`
        });
        testResults.summary.failed++;
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Erro ao verificar dependências:'), error);
    testResults.dependencyTests.push({
      name: 'Dependency Checks',
      status: 'error',
      details: `Erro ao verificar dependências: ${error.message}`
    });
    testResults.summary.failed++;
  }
}

/**
 * Verifica se o servidor está rodando
 */
async function isServerRunning() {
  try {
    await axios.get(BASE_URL, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Testa SQL Injection em um endpoint
 * @param {string} endpoint - Endpoint a ser testado
 */
async function testSqlInjection(endpoint) {
  const payloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' OR '1'='1' --",
    "admin' --"
  ];
  
  const result = {
    name: `SQL Injection: ${endpoint}`,
    status: 'passed',
    details: 'Endpoint não vulnerável a SQL Injection',
    issues: []
  };
  
  try {
    for (const payload of payloads) {
      const url = `${BASE_URL}${endpoint}?q=${encodeURIComponent(payload)}`;
      const response = await axios.get(url, { validateStatus: () => true });
      
      // Verificar se a resposta indica uma possível vulnerabilidade
      if (response.status === 500 || 
          (response.data && 
           (response.data.includes('SQL syntax') || 
            response.data.includes('ORA-') || 
            response.data.includes('syntax error')))) {
        result.status = 'critical';
        result.details = 'Endpoint potencialmente vulnerável a SQL Injection';
        result.issues.push({
          payload,
          response: response.status,
          evidence: typeof response.data === 'string' ? 
                    response.data.substring(0, 200) : 
                    'Resposta não textual'
        });
      }
    }
    
    return result;
  } catch (error) {
    return {
      name: `SQL Injection: ${endpoint}`,
      status: 'error',
      details: `Erro ao testar SQL Injection: ${error.message}`
    };
  }
}

/**
 * Testa XSS em um endpoint
 * @param {string} endpoint - Endpoint a ser testado
 */
async function testXSS(endpoint) {
  const payloads = [
    '<script>alert(1)</script>',
    '"><script>alert(1)</script>',
    '><script>alert(1)</script>',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)"'
  ];
  
  const result = {
    name: `XSS: ${endpoint}`,
    status: 'passed',
    details: 'Endpoint não vulnerável a XSS',
    issues: []
  };
  
  try {
    for (const payload of payloads) {
      const url = `${BASE_URL}${endpoint}?q=${encodeURIComponent(payload)}`;
      const response = await axios.get(url, { validateStatus: () => true });
      
      // Verificar se a resposta contém o payload sem escape
      if (response.data && typeof response.data === 'string' && 
          response.data.includes(payload.replace(/"/g, '\"'))) {
        result.status = 'critical';
        result.details = 'Endpoint potencialmente vulnerável a XSS';
        result.issues.push({
          payload,
          response: response.status,
          evidence: response.data.substring(0, 200)
        });
      }
    }
    
    return result;
  } catch (error) {
    return {
      name: `XSS: ${endpoint}`,
      status: 'error',
      details: `Erro ao testar XSS: ${error.message}`
    };
  }
}

/**
 * Testa CSRF em um endpoint
 * @param {string} endpoint - Endpoint a ser testado
 */
async function testCSRF(endpoint) {
  try {
    // Verificar se o endpoint aceita POST sem CSRF token
    const response = await axios.post(
      `${BASE_URL}${endpoint}`,
      { test: 'data' },
      { 
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      }
    );
    
    // Se o endpoint aceitar POST sem erro de CSRF, pode ser vulnerável
    // Excluir 404 (endpoint não existe) e 401 (não autenticado)
    if (response.status !== 404 && 
        response.status !== 401 && 
        response.status < 500 &&
        !response.headers['x-csrf-token'] &&
        !response.data.includes('csrf')) {
      return {
        name: `CSRF: ${endpoint}`,
        status: 'warning',
        details: `Endpoint pode não ter proteção CSRF adequada (status ${response.status})`
      };
    }
    
    return {
      name: `CSRF: ${endpoint}`,
      status: 'passed',
      details: 'Endpoint parece ter proteção CSRF adequada'
    };
  } catch (error) {
    return {
      name: `CSRF: ${endpoint}`,
      status: 'error',
      details: `Erro ao testar CSRF: ${error.message}`
    };
  }
}

/**
 * Testa rate limiting em um endpoint
 * @param {string} endpoint - Endpoint a ser testado
 */
async function testRateLimiting(endpoint) {
  try {
    const requests = [];
    let limitDetected = false;
    
    // Enviar 20 requisições em rápida sucessão
    for (let i = 0; i < 20; i++) {
      requests.push(
        axios.get(`${BASE_URL}${endpoint}`, { validateStatus: () => true })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // Verificar se alguma resposta indica rate limiting
    for (const response of responses) {
      if (response.status === 429 || 
          response.headers['retry-after'] ||
          response.headers['x-rate-limit-remaining'] === '0') {
        limitDetected = true;
        break;
      }
    }
    
    if (limitDetected) {
      return {
        name: `Rate Limiting: ${endpoint}`,
        status: 'passed',
        details: 'Rate limiting detectado no endpoint'
      };
    } else {
      return {
        name: `Rate Limiting: ${endpoint}`,
        status: 'warning',
        details: 'Rate limiting não detectado no endpoint'
      };
    }
  } catch (error) {
    return {
      name: `Rate Limiting: ${endpoint}`,
      status: 'error',
      details: `Erro ao testar rate limiting: ${error.message}`
    };
  }
}

/**
 * Verifica se o ESLint está configurado com plugins de segurança
 */
function checkForEslintSecurityPlugins() {
  try {
    // Verificar arquivo de configuração do ESLint
    const eslintFiles = [
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc'
    ];
    
    for (const file of eslintFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Verificar se contém plugins de segurança
        if (content.includes('eslint-plugin-security') || 
            content.includes('security') || 
            content.includes('no-eval') || 
            content.includes('no-unsafe')) {
          return true;
        }
      }
    }
    
    // Verificar package.json para plugins de segurança
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps['eslint-plugin-security'] || deps['eslint-config-security']) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao verificar plugins de segurança do ESLint:', error);
    return false;
  }
}

/**
 * Extrai problemas de segurança do output do ESLint
 * @param {string} output - Output do ESLint
 */
function extractSecurityIssuesFromEslint(output) {
  const securityIssues = [];
  const lines = output.split('\n');
  
  // Padrões de segurança para procurar no output do ESLint
  const securityPatterns = [
    'security',
    'no-eval',
    'no-unsafe',
    'injection',
    'xss',
    'csrf',
    'prototype pollution',
    'sql injection',
    'command injection',
    'insecure random',
    'weak crypto'
  ];
  
  let currentFile = null;
  
  for (const line of lines) {
    // Verificar se é uma linha de arquivo
    if (line.trim() && !line.startsWith(' ')) {
      currentFile = line.trim();
      continue;
    }
    
    // Verificar se a linha contém um problema de segurança
    const isSecurityIssue = securityPatterns.some(pattern => 
      line.toLowerCase().includes(pattern)
    );
    
    if (isSecurityIssue && currentFile) {
      securityIssues.push({
        file: currentFile,
        issue: line.trim()
      });
    }
  }
  
  return securityIssues;
}

/**
 * Verifica padrões de segurança no código
 */
function checkSecurityPatterns() {
  const issues = [];
  let hasCritical = false;
  
  // Padrões inseguros para procurar
  const insecurePatterns = [
    { pattern: 'eval\\(', severity: 'critical', description: 'Uso de eval() pode levar a execução de código arbitrário' },
    { pattern: 'setTimeout\\(\\s*[\'\"]', severity: 'critical', description: 'setTimeout com string pode levar a execução de código arbitrário' },
    { pattern: 'setInterval\\(\\s*[\'\"]', severity: 'critical', description: 'setInterval com string pode levar a execução de código arbitrário' },
    { pattern: 'document\\.write\\(', severity: 'high', description: 'document.write pode levar a XSS' },
    { pattern: 'innerHTML\\s*=', severity: 'high', description: 'innerHTML pode levar a XSS se não sanitizado' },
    { pattern: 'outerHTML\\s*=', severity: 'high', description: 'outerHTML pode levar a XSS se não sanitizado' },
    { pattern: 'exec\\(', severity: 'high', description: 'Execução de comandos pode ser perigosa se não sanitizada' },
    { pattern: 'child_process', severity: 'high', description: 'Uso de child_process pode ser perigoso se não sanitizado' },
    { pattern: 'Math\\.random\\(\\)', severity: 'medium', description: 'Math.random() não é criptograficamente seguro' },
    { pattern: '\\.createServer\\(\\s*\\{\\s*key', severity: 'info', description: 'Verificar configuração SSL/TLS' },
    { pattern: 'noVerify|rejectUnauthorized:\\s*false', severity: 'critical', description: 'Desabilitar verificação de certificados é inseguro' },
    { pattern: 'SECRET|PRIVATE_KEY|PASSWORD|APIKEY', severity: 'medium', description: 'Possível hardcoding de segredos' }
  ];
  
  try {
    // Buscar arquivos JS/TS no projeto
    const jsFiles = findJsFiles('src');
    
    for (const file of jsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const { pattern, severity, description } of insecurePatterns) {
        const regex = new RegExp(pattern, 'g');
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          const line = getLineNumber(content, match.index);
          const context = getLineContext(content, line);
          
          issues.push({
            file,
            line,
            pattern: pattern.replace('\\', ''),
            severity,
            description,
            context
          });
          
          if (severity === 'critical') {
            hasCritical = true;
          }
        }
      }
    }
    
    return { issues, hasCritical };
  } catch (error) {
    console.error('Erro ao verificar padrões de segurança:', error);
    return { issues: [], hasCritical: false };
  }
}

/**
 * Encontra arquivos JS/TS em um diretório recursivamente
 * @param {string} dir - Diretório a ser pesquisado
 */
function findJsFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Ignorar node_modules e diretórios de build
      if (entry.name !== 'node_modules' && 
          entry.name !== 'build' && 
          entry.name !== 'dist') {
        files.push(...findJsFiles(fullPath));
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Obtém o número da linha a partir do índice no conteúdo
 * @param {string} content - Conteúdo do arquivo
 * @param {number} index - Índice do caractere
 */
function getLineNumber(content, index) {
  const lines = content.substring(0, index).split('\n');
  return lines.length;
}

/**
 * Obtém o contexto da linha (linha anterior, atual e posterior)
 * @param {string} content - Conteúdo do arquivo
 * @param {number} lineNumber - Número da linha
 */
function getLineContext(content, lineNumber) {
  const lines = content.split('\n');
  const start = Math.max(0, lineNumber - 2);
  const end = Math.min(lines.length, lineNumber + 1);
  
  return lines.slice(start, end).join('\n');
}

/**
 * Verifica configurações de segurança em um arquivo
 * @param {string} filePath - Caminho do arquivo
 * @param {string} fileType - Tipo do arquivo
 */
function checkSecurityConfig(filePath, fileType) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        name: `Config: ${filePath}`,
        status: 'warning',
        details: 'Arquivo de configuração não encontrado'
      };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Verificar padrões inseguros em configurações
    const insecureConfigPatterns = [
      { pattern: 'noVerify|rejectUnauthorized:\s*false', description: 'Desabilitar verificação de certificados' },
      { pattern: 'SECRET|PRIVATE_KEY|PASSWORD|APIKEY', description: 'Possível hardcoding de segredos' },
      { pattern: 'allowOrigin:\s*[\'\