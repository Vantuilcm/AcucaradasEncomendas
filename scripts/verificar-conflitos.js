// scripts/verificar-conflitos.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output no console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Função para executar comandos e retornar output
function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(`${colors.red}Erro ao executar: ${command}${colors.reset}`);
    console.error(error.message);
    return '';
  }
}

// Função para ler o package.json
function readPackageJson() {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    console.error(`${colors.red}Erro ao ler package.json: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Função para verificar dependências duplicadas
function checkDuplicateDependencies() {
  console.log(`\n${colors.cyan}=== Verificando dependências duplicadas ===${colors.reset}\n`);
  
  const output = exec('npm ls --depth=0 --json');
  if (!output) return [];
  
  const dependencies = JSON.parse(output);
  const duplicates = [];
  
  if (dependencies.problems) {
    dependencies.problems.forEach(problem => {
      if (problem.includes('duplicate')) {
        const match = problem.match(/duplicate: (.+?) .+? (.+?)@/);
        if (match) {
          duplicates.push({
            package: match[1],
            version: match[2],
            problem: problem
          });
        }
      }
    });
  }
  
  return duplicates;
}

// Função para verificar peer dependencies não satisfeitas
function checkPeerDependencies() {
  console.log(`\n${colors.cyan}=== Verificando peer dependencies não satisfeitas ===${colors.reset}\n`);
  
  const output = exec('npm ls --json');
  if (!output) return [];
  
  const dependencies = JSON.parse(output);
  const peerIssues = [];
  
  if (dependencies.problems) {
    dependencies.problems.forEach(problem => {
      if (problem.includes('peer dep missing') || problem.includes('requires a peer of')) {
        peerIssues.push(problem);
      }
    });
  }
  
  return peerIssues;
}

// Função para verificar vulnerabilidades
function checkVulnerabilities() {
  console.log(`\n${colors.cyan}=== Verificando vulnerabilidades ===${colors.reset}\n`);
  
  const output = exec('npm audit --json');
  if (!output) return { count: 0, vulnerabilities: [] };
  
  try {
    const audit = JSON.parse(output);
    const vulnerabilities = [];
    
    if (audit.vulnerabilities) {
      Object.keys(audit.vulnerabilities).forEach(pkg => {
        const vuln = audit.vulnerabilities[pkg];
        vulnerabilities.push({
          package: pkg,
          severity: vuln.severity,
          via: vuln.via,
          effects: vuln.effects,
          range: vuln.range,
          nodes: vuln.nodes,
          fixAvailable: vuln.fixAvailable
        });
      });
    }
    
    return {
      count: audit.metadata ? audit.metadata.vulnerabilities.total : 0,
      vulnerabilities
    };
  } catch (error) {
    console.error(`${colors.red}Erro ao analisar resultado do audit: ${error.message}${colors.reset}`);
    return { count: 0, vulnerabilities: [] };
  }
}

// Função para verificar conflitos de versão
function checkVersionConflicts() {
  console.log(`\n${colors.cyan}=== Verificando conflitos de versão ===${colors.reset}\n`);
  
  const packageJson = readPackageJson();
  const conflicts = [];
  
  // Verificar conflitos entre dependencies e devDependencies
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  // Verificar conflitos com overrides
  if (packageJson.overrides) {
    Object.keys(packageJson.overrides).forEach(pkg => {
      const overrideVersion = packageJson.overrides[pkg];
      
      if (allDeps[pkg] && allDeps[pkg] !== overrideVersion) {
        conflicts.push({
          package: pkg,
          declaredVersion: allDeps[pkg],
          overrideVersion: overrideVersion,
          type: 'override'
        });
      }
    });
  }
  
  // Verificar conflitos com resolutions (Yarn)
  if (packageJson.resolutions) {
    Object.keys(packageJson.resolutions).forEach(pkg => {
      const resolutionVersion = packageJson.resolutions[pkg];
      
      if (allDeps[pkg] && allDeps[pkg] !== resolutionVersion) {
        conflicts.push({
          package: pkg,
          declaredVersion: allDeps[pkg],
          resolutionVersion: resolutionVersion,
          type: 'resolution'
        });
      }
    });
  }
  
  return conflicts;
}

// Função para verificar dependências obsoletas
function checkOutdatedDependencies() {
  console.log(`\n${colors.cyan}=== Verificando dependências obsoletas ===${colors.reset}\n`);
  
  const output = exec('npm outdated --json');
  if (!output) return [];
  
  try {
    const outdated = JSON.parse(output);
    const outdatedDeps = [];
    
    Object.keys(outdated).forEach(pkg => {
      const info = outdated[pkg];
      outdatedDeps.push({
        package: pkg,
        current: info.current,
        wanted: info.wanted,
        latest: info.latest,
        dependent: info.dependent,
        location: info.location
      });
    });
    
    return outdatedDeps;
  } catch (error) {
    console.error(`${colors.red}Erro ao analisar dependências obsoletas: ${error.message}${colors.reset}`);
    return [];
  }
}

// Função para gerar recomendações
function generateRecommendations(results) {
  const recommendations = [];
  
  // Recomendações para duplicatas
  if (results.duplicates.length > 0) {
    recommendations.push('Adicione overrides no package.json para forçar versões específicas das dependências duplicadas');
  }
  
  // Recomendações para peer dependencies
  if (results.peerIssues.length > 0) {
    recommendations.push('Use a flag --legacy-peer-deps ou configure "auto-install-peers=true" no .npmrc');
  }
  
  // Recomendações para vulnerabilidades
  if (results.vulnerabilities.count > 0) {
    recommendations.push('Execute "npm audit fix" para corrigir vulnerabilidades automáticas');
    recommendations.push('Para vulnerabilidades mais graves, considere atualizar manualmente os pacotes afetados');
  }
  
  // Recomendações para conflitos de versão
  if (results.versionConflicts.length > 0) {
    recommendations.push('Ao migrar para PNPM, use a seção "pnpm.overrides" no package.json para resolver conflitos de versão');
  }
  
  // Recomendações para dependências obsoletas
  if (results.outdatedDeps.length > 0) {
    recommendations.push('Considere atualizar dependências não críticas para suas versões mais recentes');
    recommendations.push('Para dependências críticas, teste cuidadosamente antes de atualizar');
  }
  
  return recommendations;
}

// Função principal
async function main() {
  console.log(`\n${colors.magenta}🔍 INICIANDO ANÁLISE DE CONFLITOS DE DEPENDÊNCIAS NPM${colors.reset}\n`);
  
  const results = {
    duplicates: checkDuplicateDependencies(),
    peerIssues: checkPeerDependencies(),
    vulnerabilities: checkVulnerabilities(),
    versionConflicts: checkVersionConflicts(),
    outdatedDeps: checkOutdatedDependencies()
  };
  
  // Determinar status geral
  let statusGeral = 'Sem conflitos';
  if (results.duplicates.length > 0 || results.peerIssues.length > 0) {
    statusGeral = 'Conflitos leves';
  }
  if (results.vulnerabilities.count > 0 || results.versionConflicts.length > 3) {
    statusGeral = 'Conflitos graves';
  }
  
  // Gerar recomendações
  const recommendations = generateRecommendations(results);
  
  // Exibir relatório
  console.log(`\n${colors.magenta}=== RELATÓRIO DE CONFLITOS NPM ===${colors.reset}\n`);
  console.log(`${colors.cyan}STATUS GERAL:${colors.reset} ${statusGeral}\n`);
  
  console.log(`${colors.cyan}📦 CONFLITOS DETECTADOS:${colors.reset}`);
  
  if (results.duplicates.length > 0) {
    console.log(`\n${colors.yellow}Dependências duplicadas:${colors.reset}`);
    results.duplicates.forEach(dup => {
      console.log(`- ${dup.package} - ${dup.problem}`);
    });
  }
  
  if (results.peerIssues.length > 0) {
    console.log(`\n${colors.yellow}Peer dependencies não satisfeitas:${colors.reset}`);
    results.peerIssues.forEach(issue => {
      console.log(`- ${issue}`);
    });
  }
  
  if (results.vulnerabilities.count > 0) {
    console.log(`\n${colors.yellow}Vulnerabilidades:${colors.reset}`);
    console.log(`- Total: ${results.vulnerabilities.count} vulnerabilidades encontradas`);
    
    const severityCounts = {};
    results.vulnerabilities.vulnerabilities.forEach(vuln => {
      severityCounts[vuln.severity] = (severityCounts[vuln.severity] || 0) + 1;
    });
    
    Object.keys(severityCounts).forEach(severity => {
      console.log(`- ${severity}: ${severityCounts[severity]}`);
    });
  }
  
  if (results.versionConflicts.length > 0) {
    console.log(`\n${colors.yellow}Conflitos de versão:${colors.reset}`);
    results.versionConflicts.forEach(conflict => {
      console.log(`- ${conflict.package} - Declarado: ${conflict.declaredVersion}, ${conflict.type === 'override' ? 'Override' : 'Resolution'}: ${conflict.overrideVersion || conflict.resolutionVersion}`);
    });
  }
  
  if (results.outdatedDeps.length > 0) {
    console.log(`\n${colors.yellow}Dependências obsoletas:${colors.reset}`);
    results.outdatedDeps.forEach(dep => {
      console.log(`- ${dep.package} - Atual: ${dep.current}, Última: ${dep.latest}`);
    });
  }
  
  console.log(`\n${colors.cyan}✅ AÇÕES RECOMENDADAS:${colors.reset}`);
  recommendations.forEach(rec => {
    console.log(`- ${rec}`);
  });
  
  console.log(`\n${colors.cyan}🧠 SUGESTÕES AVANÇADAS:${colors.reset}`);
  console.log(`- Adotar PNPM para otimização de gerenciamento de dependências`);
  console.log(`- Utilizar "pnpm why <pacote>" para analisar por que um pacote está sendo instalado`);
  console.log(`- Configurar "strict-peer-dependencies=true" após resolver todos os conflitos de peer dependencies`);
  
  console.log(`\n${colors.magenta}=== FIM DO RELATÓRIO ===${colors.reset}\n`);
  
  // Salvar relatório em arquivo
  const reportPath = path.resolve(process.cwd(), 'relatorio-conflitos-npm.md');
  const reportContent = `# Relatório de Conflitos NPM

**Status Geral:** ${statusGeral}

## 📦 Conflitos Detectados

${results.duplicates.length > 0 ? '### Dependências duplicadas\n\n' + results.duplicates.map(dup => `- ${dup.package} - ${dup.problem}`).join('\n') + '\n\n' : ''}
${results.peerIssues.length > 0 ? '### Peer dependencies não satisfeitas\n\n' + results.peerIssues.map(issue => `- ${issue}`).join('\n') + '\n\n' : ''}
${results.vulnerabilities.count > 0 ? '### Vulnerabilidades\n\n- Total: ' + results.vulnerabilities.count + ' vulnerabilidades encontradas\n\n' : ''}
${results.versionConflicts.length > 0 ? '### Conflitos de versão\n\n' + results.versionConflicts.map(conflict => `- ${conflict.package} - Declarado: ${conflict.declaredVersion}, ${conflict.type === 'override' ? 'Override' : 'Resolution'}: ${conflict.overrideVersion || conflict.resolutionVersion}`).join('\n') + '\n\n' : ''}
${results.outdatedDeps.length > 0 ? '### Dependências obsoletas\n\n' + results.outdatedDeps.map(dep => `- ${dep.package} - Atual: ${dep.current}, Última: ${dep.latest}`).join('\n') + '\n\n' : ''}

## ✅ Ações Recomendadas

${recommendations.map(rec => `- ${rec}`).join('\n')}

## 🧠 Sugestões Avançadas

- Adotar PNPM para otimização de gerenciamento de dependências
- Utilizar "pnpm why <pacote>" para analisar por que um pacote está sendo instalado
- Configurar "strict-peer-dependencies=true" após resolver todos os conflitos de peer dependencies

> Este relatório foi gerado automaticamente em ${new Date().toLocaleString()}
`;
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Relatório salvo em: ${reportPath}`);
}

// Executar função principal
main().catch(error => {
  console.error(`${colors.red}Erro durante a análise: ${error.message}${colors.reset}`);
  process.exit(1);
});