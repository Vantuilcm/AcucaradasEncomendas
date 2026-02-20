/**
 * Verificador de Vulnerabilidades - Script para detectar e corrigir problemas de segurança
 * 
 * Este script analisa as dependências do projeto em busca de vulnerabilidades
 * conhecidas e sugere correções específicas para cada problema encontrado.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações
const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json');
const SEVERITY_LEVELS = ['critical', 'high', 'moderate', 'low'];
const KNOWN_VULNERABILITIES = {
  'xmldom': {
    vulnerableVersions: ['<0.6.0'],
    fixedVersion: '0.6.0',
    cve: 'CVE-2021-32796',
    description: 'Vulnerabilidade de injeção de XML que pode levar a execução de código remoto',
    severity: 'high'
  },
  'node-fetch': {
    vulnerableVersions: ['<2.6.7', '<3.1.1'],
    fixedVersion: '2.6.7',
    cve: 'CVE-2022-0235',
    description: 'Vulnerabilidade de redirecionamento aberto que pode levar a vazamento de dados',
    severity: 'moderate'
  },
  'minimist': {
    vulnerableVersions: ['<1.2.6'],
    fixedVersion: '1.2.6',
    cve: 'CVE-2021-44906',
    description: 'Vulnerabilidade de prototype pollution',
    severity: 'high'
  },
  'lodash': {
    vulnerableVersions: ['<4.17.21'],
    fixedVersion: '4.17.21',
    cve: 'CVE-2021-23337',
    description: 'Vulnerabilidade de prototype pollution em várias funções',
    severity: 'high'
  },
  'ws': {
    vulnerableVersions: ['<7.4.6', '<8.5.0'],
    fixedVersion: '7.5.3',
    cve: 'CVE-2021-32640',
    description: 'Vulnerabilidade de negação de serviço (DoS)',
    severity: 'moderate'
  }
};

// Carregar package.json
function loadPackageJson() {
  try {
    return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  } catch (error) {
    console.error(`Erro ao carregar package.json: ${error.message}`);
    process.exit(1);
  }
}

// Verificar se uma versão é vulnerável
function isVulnerable(version, vulnerableVersions) {
  // Remover caracteres de range (^, ~, etc)
  const cleanVersion = version.replace(/[^0-9.]/g, '');
  
  // Verificar cada padrão de versão vulnerável
  return vulnerableVersions.some(vulnPattern => {
    if (vulnPattern.startsWith('<')) {
      const minVersion = vulnPattern.substring(1);
      return compareVersions(cleanVersion, minVersion) < 0;
    }
    if (vulnPattern.includes(' - ')) {
      const [minVersion, maxVersion] = vulnPattern.split(' - ');
      return compareVersions(cleanVersion, minVersion) >= 0 && 
             compareVersions(cleanVersion, maxVersion) <= 0;
    }
    return cleanVersion === vulnPattern;
  });
}

// Comparar versões semânticas
function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;
    
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  
  return 0;
}

// Verificar vulnerabilidades conhecidas
function checkKnownVulnerabilities(packageJson) {
  console.log('=== VERIFICAÇÃO DE VULNERABILIDADES CONHECIDAS ===');
  
  const vulnerabilities = [];
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  // Verificar cada dependência
  Object.entries(allDependencies).forEach(([name, version]) => {
    const knownVuln = KNOWN_VULNERABILITIES[name];
    
    if (knownVuln && isVulnerable(version, knownVuln.vulnerableVersions)) {
      vulnerabilities.push({
        package: name,
        currentVersion: version,
        fixedVersion: knownVuln.fixedVersion,
        cve: knownVuln.cve,
        description: knownVuln.description,
        severity: knownVuln.severity
      });
    }
  });
  
  // Verificar vulnerabilidades em pnpm.overrides
  if (packageJson.pnpm?.overrides) {
    Object.entries(packageJson.pnpm.overrides).forEach(([name, version]) => {
      const knownVuln = KNOWN_VULNERABILITIES[name];
      
      if (knownVuln && isVulnerable(version, knownVuln.vulnerableVersions)) {
        vulnerabilities.push({
          package: name,
          currentVersion: version,
          fixedVersion: knownVuln.fixedVersion,
          cve: knownVuln.cve,
          description: knownVuln.description,
          severity: knownVuln.severity,
          inOverrides: true
        });
      }
    });
  }
  
  return vulnerabilities;
}

// Executar audit do PNPM
function runPnpmAudit() {
  console.log('\n=== EXECUTANDO PNPM AUDIT ===');
  
  try {
    const output = execSync('pnpm audit --json', { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    // O comando pnpm audit retorna código de erro se encontrar vulnerabilidades
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (parseError) {
        console.log('Saída do pnpm audit:');
        console.log(error.stdout);
        return { vulnerabilities: {} };
      }
    }
    
    console.error(`Erro ao executar pnpm audit: ${error.message}`);
    return { vulnerabilities: {} };
  }
}

// Gerar recomendações de correção
function generateFixRecommendations(vulnerabilities, auditResults) {
  console.log('\n=== RECOMENDAÇÕES DE CORREÇÃO ===');
  
  // Agrupar por severidade
  const bySeverity = {};
  SEVERITY_LEVELS.forEach(level => bySeverity[level] = []);
  
  // Adicionar vulnerabilidades conhecidas
  vulnerabilities.forEach(vuln => {
    bySeverity[vuln.severity].push(vuln);
  });
  
  // Adicionar vulnerabilidades do audit
  if (auditResults.vulnerabilities) {
    Object.entries(auditResults.vulnerabilities).forEach(([name, info]) => {
      // Verificar se já está na lista de vulnerabilidades conhecidas
      const alreadyListed = vulnerabilities.some(v => v.package === name);
      
      if (!alreadyListed) {
        bySeverity[info.severity].push({
          package: name,
          currentVersion: info.via[0].range || 'desconhecida',
          fixedVersion: info.fixAvailable?.version || 'não disponível',
          cve: info.via[0].url || '',
          description: info.via[0].title || 'Sem descrição disponível',
          severity: info.severity,
          fromAudit: true
        });
      }
    });
  }
  
  // Exibir recomendações por severidade
  let hasVulnerabilities = false;
  
  SEVERITY_LEVELS.forEach(level => {
    const vulns = bySeverity[level];
    
    if (vulns.length > 0) {
      hasVulnerabilities = true;
      console.log(`\n[${level.toUpperCase()}] Vulnerabilidades:`);
      
      vulns.forEach(vuln => {
        console.log(`\n- Pacote: ${vuln.package}`);
        console.log(`  Versão atual: ${vuln.currentVersion}`);
        console.log(`  Versão corrigida: ${vuln.fixedVersion}`);
        console.log(`  CVE: ${vuln.cve}`);
        console.log(`  Descrição: ${vuln.description}`);
        
        // Gerar comando de correção
        if (vuln.inOverrides) {
          console.log('  Correção: Atualizar em pnpm.overrides no package.json');
        } else if (vuln.fromAudit && vuln.fixAvailable) {
          console.log(`  Correção: pnpm audit fix${vuln.severity === 'critical' || vuln.severity === 'high' ? ' --force' : ''}`);
        } else {
          console.log(`  Correção: pnpm add ${vuln.package}@${vuln.fixedVersion}`);
        }
      });
    }
  });
  
  if (!hasVulnerabilities) {
    console.log('\nNenhuma vulnerabilidade encontrada! 🎉');
  }
  
  return hasVulnerabilities;
}

// Função principal
function main() {
  console.log('=== VERIFICADOR DE VULNERABILIDADES ===\n');
  
  const packageJson = loadPackageJson();
  const vulnerabilities = checkKnownVulnerabilities(packageJson);
  const auditResults = runPnpmAudit();
  
  const hasVulnerabilities = generateFixRecommendations(vulnerabilities, auditResults);
  
  if (hasVulnerabilities) {
    console.log('\n=== RESUMO ===');
    console.log('Foram encontradas vulnerabilidades que precisam ser corrigidas.');
    console.log('Execute as correções recomendadas e depois verifique novamente com:');
    console.log('  node scripts/verificar-vulnerabilidades.js');
  } else {
    console.log('\n=== RESUMO ===');
    console.log('Nenhuma vulnerabilidade encontrada! O projeto está seguro.');
  }
}

// Executar script
main();