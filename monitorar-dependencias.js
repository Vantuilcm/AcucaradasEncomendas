/**
 * Script para monitoramento e análise de dependências
 * 
 * Este script analisa as dependências do projeto e identifica possíveis conflitos,
 * dependências duplicadas e sugestões de otimização.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para o console
const cores = {
  reset: '\x1b[0m',
  vermelho: '\x1b[31m',
  verde: '\x1b[32m',
  amarelo: '\x1b[33m',
  azul: '\x1b[34m',
  magenta: '\x1b[35m',
  ciano: '\x1b[36m',
  branco: '\x1b[37m',
  negrito: '\x1b[1m'
};

// Função para imprimir cabeçalho
function imprimirCabecalho(texto) {
  console.log(`\n${cores.negrito}${cores.ciano}=== ${texto} ===${cores.reset}\n`);
}

// Função para imprimir mensagem de sucesso
function imprimirSucesso(texto) {
  console.log(`${cores.verde}✓ ${texto}${cores.reset}`);
}

// Função para imprimir mensagem de erro
function imprimirErro(texto) {
  console.log(`${cores.vermelho}✗ ${texto}${cores.reset}`);
}

// Função para imprimir aviso
function imprimirAviso(texto) {
  console.log(`${cores.amarelo}⚠ ${texto}${cores.reset}`);
}

// Função para imprimir informação
function imprimirInfo(texto) {
  console.log(`${cores.azul}ℹ ${texto}${cores.reset}`);
}

// Função para verificar se o arquivo existe
function verificarArquivo(caminho) {
  return fs.existsSync(caminho) && fs.statSync(caminho).isFile();
}

// Função para ler o package.json
function lerPackageJson() {
  const caminhoPackageJson = path.resolve(__dirname, 'package.json');
  
  if (!verificarArquivo(caminhoPackageJson)) {
    imprimirErro('Arquivo package.json não encontrado');
    return null;
  }
  
  try {
    const conteudo = fs.readFileSync(caminhoPackageJson, 'utf8');
    return JSON.parse(conteudo);
  } catch (erro) {
    imprimirErro(`Erro ao ler package.json: ${erro.message}`);
    return null;
  }
}

// Função para verificar dependências duplicadas
function verificarDependenciasDuplicadas(packageJson) {
  imprimirCabecalho('VERIFICANDO DEPENDÊNCIAS DUPLICADAS');
  
  if (!packageJson) return;
  
  const dependencias = { ...packageJson.dependencies };
  const devDependencias = { ...packageJson.devDependencies };
  const duplicadas = [];
  
  // Verificar dependências duplicadas entre dependencies e devDependencies
  for (const dep in dependencias) {
    if (devDependencias[dep]) {
      duplicadas.push({
        nome: dep,
        versaoDep: dependencias[dep],
        versaoDevDep: devDependencias[dep]
      });
    }
  }
  
  if (duplicadas.length === 0) {
    imprimirSucesso('Nenhuma dependência duplicada encontrada');
    return;
  }
  
  imprimirAviso(`Encontradas ${duplicadas.length} dependências duplicadas:`);
  
  duplicadas.forEach(dep => {
    console.log(`${cores.amarelo}⚠ ${dep.nome}${cores.reset}`);
    console.log(`  - Em dependencies: ${dep.versaoDep}`);
    console.log(`  - Em devDependencies: ${dep.versaoDevDep}`);
    
    // Sugerir solução
    if (dep.versaoDep === dep.versaoDevDep) {
      console.log(`  ${cores.verde}→ Sugestão: Manter apenas em ${dep.nome.includes('types') ? 'devDependencies' : 'dependencies'}${cores.reset}`);
    } else {
      console.log(`  ${cores.verde}→ Sugestão: Unificar versões e manter em ${dep.nome.includes('types') ? 'devDependencies' : 'dependencies'}${cores.reset}`);
    }
  });
}

// Função para verificar dependências do React e React Native
function verificarDependenciasReactNative(packageJson) {
  imprimirCabecalho('VERIFICANDO DEPENDÊNCIAS REACT/REACT NATIVE');
  
  if (!packageJson) return;
  
  const dependencias = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Verificar versões do React e React Native
  const versaoReact = dependencias.react;
  const versaoReactNative = dependencias['react-native'];
  const versaoExpo = dependencias.expo;
  
  if (versaoReact) {
    imprimirInfo(`React: ${versaoReact}`);
  } else {
    imprimirAviso('React não encontrado nas dependências');
  }
  
  if (versaoReactNative) {
    imprimirInfo(`React Native: ${versaoReactNative}`);
  } else {
    imprimirAviso('React Native não encontrado nas dependências');
  }
  
  if (versaoExpo) {
    imprimirInfo(`Expo: ${versaoExpo}`);
  } else {
    imprimirInfo('Expo não encontrado nas dependências (não é um projeto Expo)');
  }
  
  // Verificar compatibilidade entre React e React Native
  if (versaoReact && versaoReactNative) {
    const versaoReactSemCaracteres = versaoReact.replace(/[^0-9.]/g, '');
    const versaoReactNativeSemCaracteres = versaoReactNative.replace(/[^0-9.]/g, '');
    
    const versaoReactMajor = parseInt(versaoReactSemCaracteres.split('.')[0], 10);
    const versaoReactNativeMajor = parseInt(versaoReactNativeSemCaracteres.split('.')[0], 10);
    
    if (versaoReactMajor >= 18 && versaoReactNativeMajor < 0.70) {
      imprimirAviso('Possível incompatibilidade: React 18+ geralmente requer React Native 0.70+');
    } else {
      imprimirSucesso('Versões de React e React Native parecem compatíveis');
    }
  }
  
  // Verificar compatibilidade com Expo
  if (versaoExpo && versaoReactNative) {
    const versaoExpoSemCaracteres = versaoExpo.replace(/[^0-9.]/g, '');
    const versaoReactNativeSemCaracteres = versaoReactNative.replace(/[^0-9.]/g, '');
    
    const versaoExpoMajor = parseInt(versaoExpoSemCaracteres.split('.')[0], 10);
    
    if (versaoExpoMajor >= 49) {
      imprimirInfo('Projeto usando Expo 49+');
      imprimirInfo('Verificando configurações recomendadas para Expo 49+...');
      
      // Verificar .npmrc
      const caminhoNpmrc = path.resolve(__dirname, '.npmrc');
      if (verificarArquivo(caminhoNpmrc)) {
        const conteudoNpmrc = fs.readFileSync(caminhoNpmrc, 'utf8');
        if (conteudoNpmrc.includes('public-hoist-pattern')) {
          imprimirSucesso('.npmrc configurado com padrões de hoisting');
        } else {
          imprimirAviso('.npmrc encontrado, mas sem configurações de hoisting recomendadas');
        }
      } else {
        imprimirAviso('.npmrc não encontrado. Recomendado para projetos Expo 49+');
      }
    }
  }
}

// Função para verificar configurações do Metro Bundler
function verificarMetroBundler() {
  imprimirCabecalho('VERIFICANDO CONFIGURAÇÕES DO METRO BUNDLER');
  
  const caminhoMetroConfig = path.resolve(__dirname, 'metro.config.js');
  
  if (!verificarArquivo(caminhoMetroConfig)) {
    imprimirAviso('Arquivo metro.config.js não encontrado');
    return;
  }
  
  try {
    const conteudoMetroConfig = fs.readFileSync(caminhoMetroConfig, 'utf8');
    
    // Verificar configurações importantes
    const temMaxWorkers = conteudoMetroConfig.includes('maxWorkers');
    const temResetCache = conteudoMetroConfig.includes('resetCache');
    const temDisableHierarchicalLookup = conteudoMetroConfig.includes('disableHierarchicalLookup');
    const temWatchFolders = conteudoMetroConfig.includes('watchFolders');
    const temAliases = conteudoMetroConfig.includes('extraNodeModules') || conteudoMetroConfig.includes('alias');
    
    if (temMaxWorkers) {
      imprimirSucesso('Metro Bundler configurado com maxWorkers');
    } else {
      imprimirAviso('Recomendado configurar maxWorkers no Metro Bundler');
    }
    
    if (temResetCache) {
      imprimirSucesso('Metro Bundler configurado com resetCache');
    }
    
    if (temDisableHierarchicalLookup) {
      imprimirSucesso('Metro Bundler configurado com disableHierarchicalLookup');
    }
    
    if (temWatchFolders) {
      imprimirSucesso('Metro Bundler configurado com watchFolders');
    }
    
    if (temAliases) {
      imprimirSucesso('Metro Bundler configurado com aliases');
    } else {
      imprimirInfo('Considere configurar aliases no Metro Bundler para resolver problemas de módulos');
    }
  } catch (erro) {
    imprimirErro(`Erro ao ler metro.config.js: ${erro.message}`);
  }
}

// Função para verificar dependências problemáticas com pnpm why
function verificarDependenciasProblematicas() {
  imprimirCabecalho('VERIFICANDO DEPENDÊNCIAS PROBLEMÁTICAS COM PNPM WHY');
  
  const dependenciasProblematicas = [
    'react-native-reanimated',
    '@react-navigation/native',
    'expo-router',
    'metro',
    'metro-resolver'
  ];
  
  dependenciasProblematicas.forEach(dep => {
    imprimirInfo(`Verificando dependência: ${dep}`);
    
    try {
      const resultado = execSync(`pnpm why ${dep}`, { stdio: 'pipe' }).toString();
      
      // Verificar se há múltiplas versões
      const linhasVersao = resultado.split('\n').filter(linha => linha.includes('version'));
      const versoes = new Set();
      
      linhasVersao.forEach(linha => {
        const match = linha.match(/version "([^"]+)"/i);
        if (match && match[1]) {
          versoes.add(match[1]);
        }
      });
      
      if (versoes.size > 1) {
        imprimirAviso(`Múltiplas versões de ${dep} encontradas: ${Array.from(versoes).join(', ')}`);
        imprimirInfo(`Considere adicionar um override para ${dep} no package.json`);
      } else if (versoes.size === 1) {
        imprimirSucesso(`${dep}: Versão única encontrada (${Array.from(versoes)[0]})`);
      } else {
        imprimirInfo(`${dep}: Não instalado ou não encontrado`);
      }
    } catch (erro) {
      imprimirInfo(`${dep}: Não instalado ou comando falhou`);
    }
  });
}

// Função para verificar vulnerabilidades com npm audit
function verificarVulnerabilidades() {
  imprimirCabecalho('VERIFICANDO VULNERABILIDADES COM NPM AUDIT');
  
  try {
    const resultado = execSync('npm audit --json', { stdio: 'pipe' }).toString();
    const auditData = JSON.parse(resultado);
    
    const vulnerabilidades = auditData.vulnerabilities || {};
    const totalVulnerabilidades = Object.keys(vulnerabilidades).length;
    
    if (totalVulnerabilidades === 0) {
      imprimirSucesso('Nenhuma vulnerabilidade encontrada');
      return;
    }
    
    imprimirAviso(`Encontradas ${totalVulnerabilidades} vulnerabilidades:`);
    
    // Agrupar por severidade
    const porSeveridade = {
      critical: [],
      high: [],
      moderate: [],
      low: []
    };
    
    for (const [nome, info] of Object.entries(vulnerabilidades)) {
      const severidade = info.severity;
      porSeveridade[severidade].push({
        nome,
        versao: info.version,
        severidade,
        via: Array.isArray(info.via) ? info.via.filter(v => typeof v === 'string') : []
      });
    }
    
    // Exibir vulnerabilidades críticas e altas
    if (porSeveridade.critical.length > 0) {
      console.log(`\n${cores.vermelho}${cores.negrito}VULNERABILIDADES CRÍTICAS:${cores.reset}`);
      porSeveridade.critical.forEach(v => {
        console.log(`${cores.vermelho}→ ${v.nome}@${v.versao}${cores.reset}`);
        if (v.via.length > 0) {
          console.log(`  Via: ${v.via.join(', ')}`);
        }
      });
    }
    
    if (porSeveridade.high.length > 0) {
      console.log(`\n${cores.vermelho}VULNERABILIDADES ALTAS:${cores.reset}`);
      porSeveridade.high.forEach(v => {
        console.log(`${cores.vermelho}→ ${v.nome}@${v.versao}${cores.reset}`);
        if (v.via.length > 0) {
          console.log(`  Via: ${v.via.join(', ')}`);
        }
      });
    }
    
    // Sugerir correção
    imprimirInfo('\nPara corrigir vulnerabilidades, considere:');
    console.log(`1. Executar ${cores.ciano}npm audit fix${cores.reset} para correções automáticas`);
    console.log(`2. Executar ${cores.ciano}npm audit fix --force${cores.reset} para correções que podem quebrar compatibilidade`);
    console.log(`3. Adicionar overrides no package.json para dependências problemáticas`);
  } catch (erro) {
    imprimirErro(`Erro ao verificar vulnerabilidades: ${erro.message}`);
  }
}

// Função para sugerir otimizações gerais
function sugerirOtimizacoes() {
  imprimirCabecalho('SUGESTÕES DE OTIMIZAÇÃO');
  
  console.log(`${cores.verde}1. Limpeza de caches${cores.reset}`);
  console.log(`   → Execute ${cores.ciano}limpar-caches.bat${cores.reset} regularmente`);
  console.log(`   → Limpe o cache do Metro antes de builds importantes`);
  console.log(`   → Use ${cores.ciano}pnpm store prune${cores.reset} para otimizar o cache do PNPM`);
  
  console.log(`\n${cores.verde}2. Otimização do Metro Bundler${cores.reset}`);
  console.log(`   → Limite o número de workers para evitar sobrecarga de memória`);
  console.log(`   → Adicione aliases para resolver problemas de módulos`);
  console.log(`   → Desative o Watchman se estiver causando problemas`);
  
  console.log(`\n${cores.verde}3. Gerenciamento de memória${cores.reset}`);
  console.log(`   → Configure NODE_OPTIONS=--max_old_space_size=6144 para aumentar a memória disponível`);
  console.log(`   → Feche aplicativos desnecessários durante o desenvolvimento`);
  console.log(`   → Considere aumentar o tamanho do arquivo de swap no sistema`);
  
  console.log(`\n${cores.verde}4. Resolução de conflitos de dependências${cores.reset}`);
  console.log(`   → Configure o .npmrc com padrões de hoisting específicos`);
  console.log(`   → Use overrides no package.json para forçar versões específicas`);
  console.log(`   → Mantenha versões compatíveis de React, React Native e Expo`);
  
  console.log(`\n${cores.verde}5. Otimização do ambiente de desenvolvimento${cores.reset}`);
  console.log(`   → Configure um IP fixo para o servidor de desenvolvimento`);
  console.log(`   → Configure variáveis de ambiente para melhorar a estabilidade`);
  console.log(`   → Considere usar EAS Build para builds em nuvem`);
}

// Função principal
function main() {
  console.log(`\n${cores.negrito}${cores.magenta}🔍 MONITORAMENTO DE DEPENDÊNCIAS${cores.reset}\n`);
  
  const packageJson = lerPackageJson();
  
  verificarDependenciasDuplicadas(packageJson);
  verificarDependenciasReactNative(packageJson);
  verificarMetroBundler();
  verificarDependenciasProblematicas();
  
  try {
    verificarVulnerabilidades();
  } catch (erro) {
    imprimirAviso(`Não foi possível verificar vulnerabilidades: ${erro.message}`);
  }
  
  sugerirOtimizacoes();
  
  console.log(`\n${cores.negrito}${cores.verde}✅ ANÁLISE CONCLUÍDA${cores.reset}\n`);
}

// Executar função principal
main();