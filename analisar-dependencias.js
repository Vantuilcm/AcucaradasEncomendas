/**
 * Script para analisar dependências e detectar conflitos no projeto
 * 
 * Este script analisa o projeto para identificar:
 * - Dependências com múltiplas versões instaladas
 * - Peer dependencies não satisfeitas
 * - Dependências com versões conflitantes
 * - Problemas de hoisting que podem afetar o Metro Bundler
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}\n`)
};

// Pacotes críticos para verificar
const CRITICAL_PACKAGES = [
  'react',
  'react-native',
  'expo',
  'expo-router',
  'metro',
  'metro-resolver',
  'metro-file-map',
  'metro-runtime',
  '@babel/core',
  '@babel/runtime',
  '@react-native',
  '@expo',
  'react-dom'
];

// Função para verificar se um arquivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

// Função para ler o package.json
function readPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fileExists(packageJsonPath)) {
    log.error('Arquivo package.json não encontrado!');
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (err) {
    log.error(`Erro ao ler package.json: ${err.message}`);
    process.exit(1);
  }
}

// Função para analisar dependências com múltiplas versões
async function analisarMultiplasVersoes() {
  log.title('ANALISANDO DEPENDÊNCIAS COM MÚLTIPLAS VERSÕES');
  
  try {
    // Usar pnpm list para listar todas as dependências
    const output = execSync('pnpm list --depth=999 --json', { encoding: 'utf8' });
    const deps = JSON.parse(output);
    
    // Mapear versões por pacote
    const versoesPorPacote = {};
    
    function processarDependencias(dep, caminho = []) {
      if (!dep.name) return;
      
      if (!versoesPorPacote[dep.name]) {
        versoesPorPacote[dep.name] = [];
      }
      
      // Adicionar versão se ainda não existir
      const versaoExistente = versoesPorPacote[dep.name].find(v => v.version === dep.version);
      if (!versaoExistente) {
        versoesPorPacote[dep.name].push({
          version: dep.version,
          caminhos: [caminho.join(' > ')]
        });
      } else if (caminho.length > 0) {
        versaoExistente.caminhos.push(caminho.join(' > '));
      }
      
      // Processar dependências filhas
      if (dep.dependencies) {
        for (const [childName, childDep] of Object.entries(dep.dependencies)) {
          if (childDep.name) {
            processarDependencias(childDep, [...caminho, dep.name]);
          }
        }
      }
    }
    
    // Processar a árvore de dependências
    processarDependencias(deps);
    
    // Filtrar pacotes com múltiplas versões
    const pacotesComMultiplasVersoes = Object.entries(versoesPorPacote)
      .filter(([_, versoes]) => versoes.length > 1)
      .sort((a, b) => {
        // Priorizar pacotes críticos
        const aIsCritical = CRITICAL_PACKAGES.some(pkg => a[0].startsWith(pkg));
        const bIsCritical = CRITICAL_PACKAGES.some(pkg => b[0].startsWith(pkg));
        
        if (aIsCritical && !bIsCritical) return -1;
        if (!aIsCritical && bIsCritical) return 1;
        
        // Depois ordenar por número de versões (decrescente)
        return b[1].length - a[1].length;
      });
    
    if (pacotesComMultiplasVersoes.length === 0) {
      log.success('Nenhum pacote com múltiplas versões encontrado!');
      return [];
    }
    
    log.warning(`Encontrados ${pacotesComMultiplasVersoes.length} pacotes com múltiplas versões:`);
    
    pacotesComMultiplasVersoes.forEach(([pacote, versoes]) => {
      const isCritical = CRITICAL_PACKAGES.some(pkg => pacote.startsWith(pkg));
      const prefix = isCritical ? '🔴' : '🟠';
      
      console.log(`\n${prefix} ${colors.bright}${pacote}${colors.reset} (${versoes.length} versões):`);
      versoes.forEach(({ version, caminhos }) => {
        console.log(`  ${colors.cyan}${version}${colors.reset}`);
        // Mostrar apenas os primeiros 3 caminhos para não sobrecarregar o console
        const caminhosMostrados = caminhos.slice(0, 3);
        caminhosMostrados.forEach(caminho => {
          console.log(`    - ${caminho || 'dependência direta'}`);
        });
        if (caminhos.length > 3) {
          console.log(`    - ... e ${caminhos.length - 3} outros caminhos`);
        }
      });
    });
    
    return pacotesComMultiplasVersoes;
  } catch (err) {
    log.error(`Erro ao analisar múltiplas versões: ${err.message}`);
    return [];
  }
}

// Função para analisar peer dependencies não satisfeitas
async function analisarPeerDependencies() {
  log.title('ANALISANDO PEER DEPENDENCIES NÃO SATISFEITAS');
  
  try {
    // Usar pnpm list para verificar peer dependencies
    const output = execSync('pnpm list --json', { encoding: 'utf8' });
    const peerIssues = [];
    
    // Procurar por mensagens de erro relacionadas a peer dependencies
    try {
      const result = execSync('pnpm list', { encoding: 'utf8' });
      const lines = result.split('\n');
      
      let currentPackage = null;
      let collectingPeerIssues = false;
      let currentIssues = [];
      
      for (const line of lines) {
        if (line.includes('has incorrect peer dependency')) {
          collectingPeerIssues = true;
          currentPackage = line.split('"')[1];
          currentIssues = [];
        } else if (collectingPeerIssues && line.trim().startsWith('-')) {
          currentIssues.push(line.trim().substring(2));
        } else if (collectingPeerIssues && line.trim() === '') {
          if (currentPackage && currentIssues.length > 0) {
            peerIssues.push({
              package: currentPackage,
              issues: currentIssues
            });
          }
          collectingPeerIssues = false;
          currentPackage = null;
          currentIssues = [];
        }
      }
      
      // Capturar o último conjunto de problemas, se houver
      if (collectingPeerIssues && currentPackage && currentIssues.length > 0) {
        peerIssues.push({
          package: currentPackage,
          issues: currentIssues
        });
      }
    } catch (err) {
      // Ignorar erros aqui, pois estamos apenas tentando extrair informações adicionais
    }
    
    if (peerIssues.length === 0) {
      log.success('Nenhuma peer dependency não satisfeita encontrada!');
      return [];
    }
    
    log.warning(`Encontradas ${peerIssues.length} peer dependencies não satisfeitas:`);
    
    peerIssues.forEach(({ package, issues }) => {
      const isCritical = CRITICAL_PACKAGES.some(pkg => package.startsWith(pkg));
      const prefix = isCritical ? '🔴' : '🟠';
      
      console.log(`\n${prefix} ${colors.bright}${package}${colors.reset}:`);
      issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    });
    
    return peerIssues;
  } catch (err) {
    log.error(`Erro ao analisar peer dependencies: ${err.message}`);
    return [];
  }
}

// Função para analisar dependências críticas
async function analisarDependenciasCriticas() {
  log.title('ANALISANDO DEPENDÊNCIAS CRÍTICAS');
  
  const packageJson = readPackageJson();
  const allDeps = {
    ...packageJson.dependencies || {},
    ...packageJson.devDependencies || {}
  };
  
  const criticasEncontradas = [];
  
  for (const pkg of CRITICAL_PACKAGES) {
    // Verificar dependências diretas que começam com o pacote crítico
    const matchingDeps = Object.entries(allDeps)
      .filter(([name, _]) => name === pkg || name.startsWith(`${pkg}/`));
    
    if (matchingDeps.length > 0) {
      // Para cada dependência crítica, executar pnpm why
      for (const [name, version] of matchingDeps) {
        try {
          log.info(`Analisando dependência crítica: ${name}@${version}`);
          
          const output = execSync(`pnpm why ${name}`, { encoding: 'utf8' });
          const lines = output.split('\n');
          
          // Extrair informações relevantes
          const dependedBy = lines
            .filter(line => line.includes('dependedBy:'))
            .map(line => line.trim().replace('dependedBy:', '').trim())
            .filter(Boolean);
          
          criticasEncontradas.push({
            name,
            version,
            dependedBy
          });
          
        } catch (err) {
          log.warning(`Não foi possível analisar ${name}: ${err.message}`);
        }
      }
    }
  }
  
  if (criticasEncontradas.length === 0) {
    log.warning('Nenhuma dependência crítica encontrada para análise!');
    return [];
  }
  
  log.info(`Analisadas ${criticasEncontradas.length} dependências críticas:`);
  
  criticasEncontradas.forEach(({ name, version, dependedBy }) => {
    console.log(`\n🔍 ${colors.bright}${name}@${version}${colors.reset}:`);
    
    if (dependedBy.length > 0) {
      console.log(`  Dependido por:`);
      dependedBy.slice(0, 5).forEach(dep => {
        console.log(`  - ${dep}`);
      });
      if (dependedBy.length > 5) {
        console.log(`  - ... e ${dependedBy.length - 5} outros`);
      }
    } else {
      console.log(`  Não dependido por outros pacotes (dependência direta)`);
    }
  });
  
  return criticasEncontradas;
}

// Função para verificar configurações do .npmrc
function verificarNpmrc() {
  log.title('VERIFICANDO CONFIGURAÇÕES DO .NPMRC');
  
  const npmrcPath = path.join(process.cwd(), '.npmrc');
  if (!fileExists(npmrcPath)) {
    log.warning('Arquivo .npmrc não encontrado!');
    return null;
  }
  
  try {
    const content = fs.readFileSync(npmrcPath, 'utf8');
    const lines = content.split('\n');
    
    const configsImportantes = [
      { nome: 'node-linker', valorIdeal: 'hoisted', encontrado: false },
      { nome: 'shamefully-hoist', valorIdeal: 'true', encontrado: false },
      { nome: 'strict-peer-dependencies', valorIdeal: 'false', encontrado: false },
      { nome: 'auto-install-peers', valorIdeal: 'true', encontrado: false },
      { nome: 'resolution-mode', valorIdeal: 'highest', encontrado: false },
      { nome: 'public-hoist-pattern', valorIdeal: '*', encontrado: false }
    ];
    
    // Verificar configurações
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      for (const config of configsImportantes) {
        if (trimmedLine.startsWith(`${config.nome}=`)) {
          const valor = trimmedLine.split('=')[1];
          config.valorAtual = valor;
          config.encontrado = true;
          break;
        }
      }
    }
    
    // Verificar padrões de hoisting específicos
    const hoistPatterns = lines
      .filter(line => line.trim().startsWith('public-hoist-pattern[]='))
      .map(line => line.trim().split('=')[1].replace(/^['"]|['"]$/g, ''));
    
    // Verificar se os pacotes críticos estão nos padrões de hoisting
    const pacotesCriticosFaltantes = [];
    for (const pkg of CRITICAL_PACKAGES) {
      const encontrado = hoistPatterns.some(pattern => {
        return pattern === '*' || 
               pattern === pkg || 
               pattern.startsWith(`${pkg}/`) || 
               pattern.endsWith(`/${pkg}`) || 
               pattern.includes(`/${pkg}/`) ||
               pattern.startsWith(`${pkg}@`);
      });
      
      if (!encontrado && pkg !== '@react-native' && pkg !== '@expo') {
        pacotesCriticosFaltantes.push(pkg);
      }
    }
    
    // Exibir resultados
    log.info('Configurações do .npmrc:');
    
    configsImportantes.forEach(config => {
      if (config.encontrado) {
        const isIdeal = config.valorAtual === config.valorIdeal;
        if (isIdeal) {
          log.success(`${config.nome}=${config.valorAtual}`);
        } else {
          log.warning(`${config.nome}=${config.valorAtual} (recomendado: ${config.valorIdeal})`);
        }
      } else {
        log.error(`${config.nome} não encontrado (recomendado: ${config.valorIdeal})`);
      }
    });
    
    if (hoistPatterns.length > 0) {
      log.info('\nPadrões de hoisting encontrados:');
      hoistPatterns.forEach(pattern => {
        console.log(`  - ${pattern}`);
      });
    } else if (!configsImportantes.find(c => c.nome === 'public-hoist-pattern').encontrado) {
      log.warning('Nenhum padrão de hoisting específico encontrado!');
    }
    
    if (pacotesCriticosFaltantes.length > 0) {
      log.warning('\nPacotes críticos não incluídos nos padrões de hoisting:');
      pacotesCriticosFaltantes.forEach(pkg => {
        console.log(`  - ${pkg}`);
      });
      
      log.info('\nConsidere adicionar estes pacotes ao .npmrc com:');
      pacotesCriticosFaltantes.forEach(pkg => {
        console.log(`public-hoist-pattern[]="${pkg}"`);
      });
    }
    
    return {
      configsImportantes,
      hoistPatterns,
      pacotesCriticosFaltantes
    };
  } catch (err) {
    log.error(`Erro ao verificar .npmrc: ${err.message}`);
    return null;
  }
}

// Função para gerar relatório final
function gerarRelatorio(resultados) {
  log.title('RELATÓRIO DE CONFLITOS NPM');
  
  const { multiplasVersoes, peerDependencies, dependenciasCriticas, npmrc } = resultados;
  
  // Determinar status geral
  let statusGeral = 'Sem conflitos';
  let statusColor = colors.green;
  
  const temConflitoCritico = multiplasVersoes.some(([pacote, _]) => 
    CRITICAL_PACKAGES.some(pkg => pacote === pkg || pacote.startsWith(`${pkg}/`))
  );
  
  const temPeerDependencyCritica = peerDependencies.some(({ package }) => 
    CRITICAL_PACKAGES.some(pkg => package === pkg || package.startsWith(`${pkg}/`))
  );
  
  if (temConflitoCritico || temPeerDependencyCritica) {
    statusGeral = 'Conflitos graves';
    statusColor = colors.red;
  } else if (multiplasVersoes.length > 0 || peerDependencies.length > 0) {
    statusGeral = 'Conflitos leves';
    statusColor = colors.yellow;
  }
  
  console.log(`${colors.bright}STATUS GERAL:${colors.reset} ${statusColor}${statusGeral}${colors.reset}\n`);
  
  // Listar conflitos detectados
  if (multiplasVersoes.length > 0 || peerDependencies.length > 0) {
    console.log(`${colors.bright}📦 CONFLITOS DETECTADOS:${colors.reset}`);
    
    // Múltiplas versões
    multiplasVersoes.slice(0, 10).forEach(([pacote, versoes]) => {
      const isCritical = CRITICAL_PACKAGES.some(pkg => pacote === pkg || pacote.startsWith(`${pkg}/`));
      const prefix = isCritical ? '🔴' : '🟠';
      const versoesTxt = versoes.map(v => v.version).join(' e ');
      console.log(`${prefix} ${pacote} – Conflito entre versões ${versoesTxt}`);
    });
    
    if (multiplasVersoes.length > 10) {
      console.log(`... e ${multiplasVersoes.length - 10} outros conflitos de versão`);
    }
    
    // Peer dependencies
    peerDependencies.forEach(({ package, issues }) => {
      const isCritical = CRITICAL_PACKAGES.some(pkg => package === pkg || package.startsWith(`${pkg}/`));
      const prefix = isCritical ? '🔴' : '🟠';
      console.log(`${prefix} ${package} – Peer dependency não satisfeita`);
    });
    
    console.log('');
  } else {
    console.log(`${colors.green}📦 Nenhum conflito de dependência detectado!${colors.reset}\n`);
  }
  
  // Ações recomendadas
  console.log(`${colors.bright}✅ AÇÕES RECOMENDADAS:${colors.reset}`);
  
  const recomendacoes = [];
  
  // Recomendações para múltiplas versões
  if (multiplasVersoes.length > 0) {
    const pacotesCriticos = multiplasVersoes
      .filter(([pacote, _]) => CRITICAL_PACKAGES.some(pkg => pacote === pkg || pacote.startsWith(`${pkg}/`)))
      .map(([pacote, versoes]) => {
        const versaoMaisRecente = versoes
          .map(v => v.version)
          .sort((a, b) => {
            // Ordenar versões semanticamente
            const partsA = a.split('.').map(Number);
            const partsB = b.split('.').map(Number);
            
            for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
              const partA = partsA[i] || 0;
              const partB = partsB[i] || 0;
              if (partA !== partB) return partB - partA;
            }
            
            return 0;
          })[0];
        
        return { pacote, versaoMaisRecente };
      });
    
    pacotesCriticos.forEach(({ pacote, versaoMaisRecente }) => {
      recomendacoes.push(`Adicionar override para ${pacote}@${versaoMaisRecente} no package.json`);
    });
    
    if (pacotesCriticos.length > 0) {
      recomendacoes.push(`Executar 'pnpm install --force' após adicionar os overrides`);
    }
  }
  
  // Recomendações para .npmrc
  if (npmrc && npmrc.pacotesCriticosFaltantes.length > 0) {
    recomendacoes.push(`Adicionar padrões de hoisting para: ${npmrc.pacotesCriticosFaltantes.join(', ')}`);
  }
  
  if (!npmrc || !npmrc.configsImportantes.find(c => c.nome === 'shamefully-hoist').encontrado) {
    recomendacoes.push(`Adicionar 'shamefully-hoist=true' ao .npmrc`);
  }
  
  if (recomendacoes.length > 0) {
    recomendacoes.forEach(rec => {
      console.log(`- ${rec}`);
    });
  } else {
    console.log(`- Nenhuma ação necessária, configuração atual parece adequada`);
  }
  
  console.log('');
  
  // Sugestões avançadas
  console.log(`${colors.bright}🧠 SUGESTÕES AVANÇADAS:${colors.reset}`);
  console.log(`- Executar 'node corrigir-metro-watcher.js' antes de iniciar o Metro Bundler`);
  console.log(`- Usar o script 'iniciar-metro-otimizado.bat' para iniciar o Expo`);
  console.log(`- Considerar usar 'pnpm dedupe' para reduzir duplicações`);
  
  if (multiplasVersoes.length > 5) {
    console.log(`- Considerar migrar para Yarn Berry com PnP para melhor resolução de dependências`);
  }
  
  console.log(`- Manter NODE_OPTIONS com '--max_old_space_size=6144' para evitar problemas de memória`);
  console.log(`- Desativar Watchman e usar polling no Windows para evitar problemas de watch`);
}

// Função principal
async function main() {
  log.title('ANÁLISE DE DEPENDÊNCIAS NPM');
  log.info('Iniciando análise de dependências e conflitos...');
  
  // Verificar se estamos em um projeto Node.js
  if (!fileExists(path.join(process.cwd(), 'package.json'))) {
    log.error('Este script deve ser executado na raiz de um projeto Node.js!');
    process.exit(1);
  }
  
  // Executar análises
  const multiplasVersoes = await analisarMultiplasVersoes();
  const peerDependencies = await analisarPeerDependencies();
  const dependenciasCriticas = await analisarDependenciasCriticas();
  const npmrc = verificarNpmrc();
  
  // Gerar relatório
  gerarRelatorio({
    multiplasVersoes,
    peerDependencies,
    dependenciasCriticas,
    npmrc
  });
  
  log.title('ANÁLISE CONCLUÍDA');
}

// Executar o script
main().catch(err => {
  log.error(`Erro ao executar análise: ${err.message}`);
  process.exit(1);
});