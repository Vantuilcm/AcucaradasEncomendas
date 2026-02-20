/**
 * NPM Conflict Solver - Script para detectar e resolver conflitos de dependências
 * 
 * Este script analisa o package.json e package-lock.json para identificar:
 * - Conflitos entre versões diretas e transitivas
 * - Peer dependencies não satisfeitas
 * - Dependências com versões depreciadas ou inseguras
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk'); // Instale com: pnpm add -D chalk

// Configurações
const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json');
const PACKAGE_LOCK_PATH = path.resolve(process.cwd(), 'pnpm-lock.yaml');
const SEVERITY_LEVELS = {
  HIGH: 'alto',
  MEDIUM: 'médio',
  LOW: 'baixo'
};

// Carregar arquivos
function loadPackageJson() {
  try {
    return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  } catch (error) {
    console.error(chalk.red(`Erro ao carregar package.json: ${error.message}`));
    process.exit(1);
  }
}

// Verificar se o PNPM está sendo usado
function checkPnpmUsage() {
  try {
    const packageJson = loadPackageJson();
    const usingPnpm = packageJson.pnpm !== undefined;
    
    console.log(chalk.blue('=== VERIFICAÇÃO DE GERENCIADOR DE PACOTES ==='));
    if (usingPnpm) {
      console.log(chalk.green('✓ Projeto está configurado para usar PNPM'));
    } else {
      console.log(chalk.yellow('⚠️ Projeto não está configurado para usar PNPM'));
      console.log(chalk.yellow('  Recomendação: Migre para PNPM para melhor gerenciamento de dependências'));
    }
    console.log();
    
    return usingPnpm;
  } catch (error) {
    console.error(chalk.red(`Erro ao verificar uso do PNPM: ${error.message}`));
    return false;
  }
}

// Detectar conflitos de versão
function detectVersionConflicts() {
  console.log(chalk.blue('=== ANÁLISE DE CONFLITOS DE VERSÃO ==='));
  
  try {
    // Executar pnpm list para obter todas as dependências
    const output = execSync('pnpm list --json', { encoding: 'utf8' });
    const dependencies = JSON.parse(output);
    
    // Analisar dependências para encontrar múltiplas versões
    const versionMap = new Map();
    const conflicts = [];
    
    // Função recursiva para percorrer dependências
    function traverseDependencies(deps, path = []) {
      if (!deps || typeof deps !== 'object') return;
      
      Object.entries(deps).forEach(([name, info]) => {
        if (!info || typeof info !== 'object') return;
        
        const currentPath = [...path, name];
        const version = info.version;
        
        if (version) {
          if (!versionMap.has(name)) {
            versionMap.set(name, [{ version, path: currentPath }]);
          } else {
            const existing = versionMap.get(name);
            const hasVersion = existing.some(e => e.version === version);
            
            if (!hasVersion) {
              existing.push({ version, path: currentPath });
              versionMap.set(name, existing);
            }
          }
        }
        
        // Recursivamente verificar dependências aninhadas
        if (info.dependencies) {
          traverseDependencies(info.dependencies, currentPath);
        }
      });
    }
    
    // Iniciar análise
    if (dependencies.dependencies) {
      traverseDependencies(dependencies.dependencies);
    }
    
    // Identificar pacotes com múltiplas versões
    versionMap.forEach((versions, name) => {
      if (versions.length > 1) {
        conflicts.push({
          name,
          versions: versions.map(v => ({ 
            version: v.version, 
            path: v.path.join(' > ')
          })),
          severity: versions.length > 2 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM
        });
      }
    });
    
    // Exibir resultados
    if (conflicts.length === 0) {
      console.log(chalk.green('✓ Nenhum conflito de versão detectado'));
    } else {
      console.log(chalk.yellow(`⚠️ Detectados ${conflicts.length} pacotes com múltiplas versões:`));
      
      conflicts.forEach(conflict => {
        console.log(chalk.yellow(`\n  Pacote: ${conflict.name} (Severidade: ${conflict.severity})`));
        conflict.versions.forEach(v => {
          console.log(`    - Versão ${v.version} (${v.path})`);
        });
      });
      
      console.log(chalk.yellow('\n  Recomendação: Utilize pnpm.overrides para fixar versões específicas'));
    }
    
    return conflicts;
  } catch (error) {
    console.error(chalk.red(`Erro ao detectar conflitos de versão: ${error.message}`));
    return [];
  }
}

// Verificar peer dependencies não satisfeitas
function checkPeerDependencies() {
  console.log(chalk.blue('\n=== VERIFICAÇÃO DE PEER DEPENDENCIES ==='));
  
  try {
    // Executar pnpm list para verificar peer dependencies
    const output = execSync('pnpm list', { encoding: 'utf8' });
    
    // Procurar por mensagens de peer dependency não satisfeitas
    const peerDepRegex = /UNMET PEER DEPENDENCY|peer dependency .* not installed/gi;
    const peerDepMatches = output.match(peerDepRegex);
    
    if (!peerDepMatches) {
      console.log(chalk.green('✓ Todas as peer dependencies estão satisfeitas'));
      return [];
    }
    
    // Extrair informações detalhadas sobre peer dependencies não satisfeitas
    const peerDepIssues = [];
    const peerDepLines = output.split('\n').filter(line => 
      line.includes('UNMET PEER DEPENDENCY') || 
      line.includes('peer dependency') && line.includes('not installed')
    );
    
    peerDepLines.forEach(line => {
      // Extrair nome do pacote e versão requerida
      const match = line.match(/([\w@\/-]+)(?:@([\w\.-]+))?/);
      if (match) {
        peerDepIssues.push({
          package: match[1],
          requiredVersion: match[2] || 'não especificada',
          message: line.trim()
        });
      }
    });
    
    // Exibir resultados
    console.log(chalk.yellow(`⚠️ Detectadas ${peerDepIssues.length} peer dependencies não satisfeitas:`));
    
    peerDepIssues.forEach(issue => {
      console.log(chalk.yellow(`\n  Pacote: ${issue.package}`));
      console.log(`    Versão requerida: ${issue.requiredVersion}`);
      console.log(`    Mensagem: ${issue.message}`);
    });
    
    console.log(chalk.yellow('\n  Recomendação: Instale as peer dependencies manualmente ou use pnpm.overrides'));
    
    return peerDepIssues;
  } catch (error) {
    console.error(chalk.red(`Erro ao verificar peer dependencies: ${error.message}`));
    return [];
  }
}

// Verificar dependências obsoletas ou inseguras
function checkOutdatedDependencies() {
  console.log(chalk.blue('\n=== VERIFICAÇÃO DE DEPENDÊNCIAS OBSOLETAS ==='));
  
  try {
    // Executar pnpm outdated para verificar dependências desatualizadas
    const output = execSync('pnpm outdated --format json', { encoding: 'utf8' });
    const outdated = JSON.parse(output);
    
    if (Object.keys(outdated).length === 0) {
      console.log(chalk.green('✓ Todas as dependências estão atualizadas'));
      return [];
    }
    
    // Processar dependências desatualizadas
    const outdatedDeps = Object.entries(outdated).map(([name, info]) => {
      const current = info.current || 'desconhecida';
      const latest = info.latest || 'desconhecida';
      const type = info.type || 'dependencies';
      
      // Determinar severidade com base na diferença de versão
      let severity = SEVERITY_LEVELS.LOW;
      if (current && latest) {
        const currentParts = current.split('.');
        const latestParts = latest.split('.');
        
        if (currentParts[0] !== latestParts[0]) {
          severity = SEVERITY_LEVELS.HIGH; // Mudança de versão major
        } else if (currentParts[1] !== latestParts[1]) {
          severity = SEVERITY_LEVELS.MEDIUM; // Mudança de versão minor
        }
      }
      
      return {
        name,
        current,
        latest,
        type,
        severity
      };
    });
    
    // Exibir resultados
    console.log(chalk.yellow(`⚠️ Detectadas ${outdatedDeps.length} dependências desatualizadas:`));
    
    // Agrupar por severidade
    const highSeverity = outdatedDeps.filter(dep => dep.severity === SEVERITY_LEVELS.HIGH);
    const mediumSeverity = outdatedDeps.filter(dep => dep.severity === SEVERITY_LEVELS.MEDIUM);
    const lowSeverity = outdatedDeps.filter(dep => dep.severity === SEVERITY_LEVELS.LOW);
    
    if (highSeverity.length > 0) {
      console.log(chalk.red(`\n  Severidade Alta (${highSeverity.length}):`));
      highSeverity.forEach(dep => {
        console.log(`    - ${dep.name}: ${dep.current} → ${dep.latest} (${dep.type})`);
      });
    }
    
    if (mediumSeverity.length > 0) {
      console.log(chalk.yellow(`\n  Severidade Média (${mediumSeverity.length}):`));
      mediumSeverity.forEach(dep => {
        console.log(`    - ${dep.name}: ${dep.current} → ${dep.latest} (${dep.type})`);
      });
    }
    
    if (lowSeverity.length > 0) {
      console.log(chalk.blue(`\n  Severidade Baixa (${lowSeverity.length}):`));
      lowSeverity.forEach(dep => {
        console.log(`    - ${dep.name}: ${dep.current} → ${dep.latest} (${dep.type})`);
      });
    }
    
    console.log(chalk.yellow('\n  Recomendação: Atualize as dependências críticas e teste a compatibilidade'));
    
    return outdatedDeps;
  } catch (error) {
    console.error(chalk.red(`Erro ao verificar dependências obsoletas: ${error.message}`));
    return [];
  }
}

// Verificar vulnerabilidades de segurança
function checkVulnerabilities() {
  console.log(chalk.blue('\n=== VERIFICAÇÃO DE VULNERABILIDADES ==='));
  
  try {
    // Executar pnpm audit para verificar vulnerabilidades
    const output = execSync('pnpm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(output);
    
    if (audit.vulnerabilities && Object.keys(audit.vulnerabilities).length === 0) {
      console.log(chalk.green('✓ Nenhuma vulnerabilidade detectada'));
      return [];
    }
    
    // Processar vulnerabilidades
    const vulnerabilities = [];
    if (audit.vulnerabilities) {
      Object.entries(audit.vulnerabilities).forEach(([severity, count]) => {
        if (count > 0) {
          vulnerabilities.push({ severity, count });
        }
      });
    }
    
    // Exibir resultados
    if (vulnerabilities.length === 0) {
      console.log(chalk.green('✓ Nenhuma vulnerabilidade detectada'));
    } else {
      console.log(chalk.red(`⚠️ Detectadas vulnerabilidades:`));
      
      vulnerabilities.forEach(vuln => {
        const color = vuln.severity === 'critical' || vuln.severity === 'high' ? 
          chalk.red : vuln.severity === 'moderate' ? chalk.yellow : chalk.blue;
        
        console.log(color(`    - ${vuln.count} vulnerabilidades de severidade ${vuln.severity}`));
      });
      
      console.log(chalk.yellow('\n  Recomendação: Execute pnpm audit fix para corrigir vulnerabilidades'));
      console.log(chalk.yellow('  Para vulnerabilidades críticas, considere pnpm audit fix --force (com cautela)'));
    }
    
    return vulnerabilities;
  } catch (error) {
    console.error(chalk.red(`Erro ao verificar vulnerabilidades: ${error.message}`));
    return [];
  }
}

// Gerar recomendações de resolução
function generateRecommendations(conflicts, peerIssues, outdated, vulnerabilities) {
  console.log(chalk.blue('\n=== RECOMENDAÇÕES DE RESOLUÇÃO ==='));
  
  const packageJson = loadPackageJson();
  const recommendations = [];
  
  // Recomendações para conflitos de versão
  if (conflicts.length > 0) {
    const highSeverityConflicts = conflicts.filter(c => c.severity === SEVERITY_LEVELS.HIGH);
    
    if (highSeverityConflicts.length > 0) {
      console.log(chalk.yellow('1. Resolva os seguintes conflitos de versão de alta severidade:'));
      
      // Gerar sugestão de overrides
      const suggestedOverrides = {};
      
      highSeverityConflicts.forEach(conflict => {
        // Escolher a versão mais recente como sugestão
        const versions = conflict.versions.map(v => v.version);
        const latestVersion = versions.sort((a, b) => {
          const aParts = a.split('.').map(Number);
          const bParts = b.split('.').map(Number);
          
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aVal = i < aParts.length ? aParts[i] : 0;
            const bVal = i < bParts.length ? bParts[i] : 0;
            
            if (aVal !== bVal) return bVal - aVal;
          }
          
          return 0;
        })[0];
        
        suggestedOverrides[conflict.name] = latestVersion;
        console.log(`   - ${conflict.name}: Fixe na versão ${latestVersion}`);
      });
      
      // Mostrar código para adicionar ao package.json
      console.log('\n   Adicione ao seu package.json:');
      
      const pnpmSection = packageJson.pnpm || {};
      const overrides = { ...pnpmSection.overrides, ...suggestedOverrides };
      
      console.log(JSON.stringify({ pnpm: { overrides } }, null, 2));
      
      recommendations.push('Resolver conflitos de versão com pnpm.overrides');
    }
  }
  
  // Recomendações para peer dependencies
  if (peerIssues.length > 0) {
    console.log(chalk.yellow('\n2. Instale as seguintes peer dependencies:'));
    
    peerIssues.forEach(issue => {
      console.log(`   - ${issue.package}${issue.requiredVersion !== 'não especificada' ? '@' + issue.requiredVersion : ''}`);
    });
    
    const installCommand = `pnpm add ${peerIssues
      .map(i => `${i.package}${i.requiredVersion !== 'não especificada' ? '@' + i.requiredVersion : ''}`)
      .join(' ')}`;
    
    console.log(`\n   Comando sugerido: ${installCommand}`);
    
    recommendations.push('Instalar peer dependencies ausentes');
  }
  
  // Recomendações para dependências obsoletas
  if (outdated.length > 0) {
    const criticalUpdates = outdated.filter(d => d.severity === SEVERITY_LEVELS.HIGH);
    
    if (criticalUpdates.length > 0) {
      console.log(chalk.yellow('\n3. Atualize as seguintes dependências críticas:'));
      
      criticalUpdates.forEach(dep => {
        console.log(`   - ${dep.name}: ${dep.current} → ${dep.latest}`);
      });
      
      const updateCommand = `pnpm update ${criticalUpdates.map(d => d.name).join(' ')}`;
      console.log(`\n   Comando sugerido: ${updateCommand}`);
      
      recommendations.push('Atualizar dependências críticas');
    }
  }
  
  // Recomendações para vulnerabilidades
  if (vulnerabilities.length > 0) {
    const criticalVulns = vulnerabilities.filter(v => 
      v.severity === 'critical' || v.severity === 'high'
    );
    
    if (criticalVulns.length > 0) {
      console.log(chalk.yellow('\n4. Corrija vulnerabilidades de segurança:'));
      console.log('   - Execute: pnpm audit fix');
      console.log('   - Para vulnerabilidades que requerem atualizações de versão major: pnpm audit fix --force (use com cautela)');
      
      recommendations.push('Corrigir vulnerabilidades de segurança');
    }
  }
  
  // Recomendações gerais
  console.log(chalk.blue('\n=== RECOMENDAÇÕES GERAIS ==='));
  console.log('1. Mantenha suas dependências atualizadas regularmente');
  console.log('2. Utilize pnpm.overrides para resolver conflitos de versão');
  console.log('3. Considere usar ferramentas como Dependabot ou Renovate para automação');
  console.log('4. Documente decisões de fixação de versão para referência futura');
  
  return recommendations;
}

// Função principal
function main() {
  console.log(chalk.green('=== NPM CONFLICT SOLVER ==='));
  console.log(chalk.green('Analisando dependências do projeto...\n'));
  
  // Verificar se o PNPM está sendo usado
  const usingPnpm = checkPnpmUsage();
  
  // Executar verificações
  const conflicts = detectVersionConflicts();
  const peerIssues = checkPeerDependencies();
  const outdated = checkOutdatedDependencies();
  const vulnerabilities = checkVulnerabilities();
  
  // Gerar recomendações
  const recommendations = generateRecommendations(
    conflicts, 
    peerIssues, 
    outdated, 
    vulnerabilities
  );
  
  // Resumo final
  console.log(chalk.green('\n=== RESUMO DA ANÁLISE ==='));
  
  const totalIssues = conflicts.length + peerIssues.length + 
    outdated.filter(d => d.severity === SEVERITY_LEVELS.HIGH).length + 
    vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length;
  
  let statusGeral = 'Sem conflitos';
  if (totalIssues > 10) {
    statusGeral = 'Conflitos graves';
  } else if (totalIssues > 0) {
    statusGeral = 'Conflitos leves';
  }
  
  console.log(`STATUS GERAL: ${statusGeral}`);
  console.log(`Total de problemas detectados: ${totalIssues}`);
  console.log(`Conflitos de versão: ${conflicts.length}`);
  console.log(`Peer dependencies não satisfeitas: ${peerIssues.length}`);
  console.log(`Dependências obsoletas críticas: ${outdated.filter(d => d.severity === SEVERITY_LEVELS.HIGH).length}`);
  console.log(`Vulnerabilidades críticas/altas: ${vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length}`);
  
  if (recommendations.length > 0) {
    console.log(chalk.yellow('\nAções recomendadas:'));
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  console.log(chalk.green('\nAnálise concluída!'));
}

// Executar o script
main();