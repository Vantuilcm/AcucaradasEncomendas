/**
 * Script para gerenciamento de dependências e otimização de projetos Expo/React Native
 * 
 * Este script fornece ferramentas para:
 * 1. Gerenciamento de dependências com PNPM
 * 2. Otimização de desempenho
 * 3. Manutenção contínua
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

// Função para verificar se o diretório existe
function verificarDiretorio(caminho) {
  return fs.existsSync(caminho) && fs.statSync(caminho).isDirectory();
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

// Função para salvar o package.json
function salvarPackageJson(packageJson) {
  const caminhoPackageJson = path.resolve(__dirname, 'package.json');
  
  try {
    fs.writeFileSync(caminhoPackageJson, JSON.stringify(packageJson, null, 2), 'utf8');
    imprimirSucesso('package.json atualizado com sucesso');
    return true;
  } catch (erro) {
    imprimirErro(`Erro ao salvar package.json: ${erro.message}`);
    return false;
  }
}

// Função para verificar a configuração do .npmrc
function verificarNpmrc() {
  imprimirCabecalho('VERIFICANDO CONFIGURAÇÃO DO .NPMRC');
  
  const caminhoNpmrc = path.resolve(__dirname, '.npmrc');
  
  if (!verificarArquivo(caminhoNpmrc)) {
    imprimirAviso('Arquivo .npmrc não encontrado');
    imprimirInfo('Criando arquivo .npmrc com configurações otimizadas para Expo...');
    
    const conteudoNpmrc = `# Configurações otimizadas para projetos Expo/React Native

# Habilitar hoisting para reduzir duplicação de dependências
shallow-hoist=true

# Configurações específicas para pacotes problemáticos
public-hoist-pattern[]=*@babel*
public-hoist-pattern[]=*@expo*
public-hoist-pattern[]=*metro*
public-hoist-pattern[]=*react*
public-hoist-pattern[]=*react-native*

# Configurações de desempenho
network-timeout=100000
fetch-timeout=100000
fetch-retries=5
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000

# Configurações de cache
prefer-offline=true
offline-cache-expiration=7
`;
    
    try {
      fs.writeFileSync(caminhoNpmrc, conteudoNpmrc, 'utf8');
      imprimirSucesso('Arquivo .npmrc criado com sucesso');
    } catch (erro) {
      imprimirErro(`Erro ao criar arquivo .npmrc: ${erro.message}`);
    }
  } else {
    imprimirSucesso('Arquivo .npmrc encontrado');
    
    // Verificar se o arquivo contém as configurações necessárias
    const conteudoNpmrc = fs.readFileSync(caminhoNpmrc, 'utf8');
    
    if (!conteudoNpmrc.includes('public-hoist-pattern')) {
      imprimirAviso('Arquivo .npmrc não contém padrões de hoisting');
      imprimirInfo('Atualizando arquivo .npmrc com padrões de hoisting...');
      
      const novosPatterns = `
# Configurações específicas para pacotes problemáticos
public-hoist-pattern[]=*@babel*
public-hoist-pattern[]=*@expo*
public-hoist-pattern[]=*metro*
public-hoist-pattern[]=*react*
public-hoist-pattern[]=*react-native*
`;
      
      try {
        fs.appendFileSync(caminhoNpmrc, novosPatterns, 'utf8');
        imprimirSucesso('Arquivo .npmrc atualizado com sucesso');
      } catch (erro) {
        imprimirErro(`Erro ao atualizar arquivo .npmrc: ${erro.message}`);
      }
    } else {
      imprimirSucesso('Arquivo .npmrc já contém padrões de hoisting');
    }
  }
}

// Função para verificar a configuração do metro.config.js
function verificarMetroConfig() {
  imprimirCabecalho('VERIFICANDO CONFIGURAÇÃO DO METRO BUNDLER');
  
  const caminhoMetroConfig = path.resolve(__dirname, 'metro.config.js');
  
  if (!verificarArquivo(caminhoMetroConfig)) {
    imprimirAviso('Arquivo metro.config.js não encontrado');
    imprimirInfo('Criando arquivo metro.config.js com configurações otimizadas...');
    
    const conteudoMetroConfig = `// Configuração otimizada do Metro Bundler para projetos Expo/React Native
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Obter configuração padrão do Expo
const config = getDefaultConfig(__dirname);

// Otimizações de desempenho
config.maxWorkers = Math.max(2, Math.floor(require('os').cpus().length / 2));
config.resetCache = false;
config.transformer.minifierConfig = { compress: { drop_console: false } };

// Otimizações para resolver problemas de módulos
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Aliases para resolver problemas de dependências
config.resolver.extraNodeModules = {
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
  'expo': path.resolve(__dirname, 'node_modules/expo'),
};

// Configuração de watchFolders para monorepos
config.watchFolders = [__dirname];

module.exports = config;
`;
    
    try {
      fs.writeFileSync(caminhoMetroConfig, conteudoMetroConfig, 'utf8');
      imprimirSucesso('Arquivo metro.config.js criado com sucesso');
    } catch (erro) {
      imprimirErro(`Erro ao criar arquivo metro.config.js: ${erro.message}`);
    }
  } else {
    imprimirSucesso('Arquivo metro.config.js encontrado');
    
    // Verificar se o arquivo contém as configurações necessárias
    const conteudoMetroConfig = fs.readFileSync(caminhoMetroConfig, 'utf8');
    
    if (!conteudoMetroConfig.includes('maxWorkers') || !conteudoMetroConfig.includes('extraNodeModules')) {
      imprimirAviso('Arquivo metro.config.js não contém todas as otimizações necessárias');
      imprimirInfo('Considere atualizar o arquivo metro.config.js manualmente com as seguintes configurações:');
      console.log(`
${cores.ciano}// Otimizações de desempenho
config.maxWorkers = Math.max(2, Math.floor(require('os').cpus().length / 2));
config.resetCache = false;

// Otimizações para resolver problemas de módulos
config.resolver.disableHierarchicalLookup = true;

// Aliases para resolver problemas de dependências
config.resolver.extraNodeModules = {
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
  'expo': path.resolve(__dirname, 'node_modules/expo'),
};${cores.reset}
`);
    } else {
      imprimirSucesso('Arquivo metro.config.js já contém otimizações necessárias');
    }
  }
}

// Função para verificar e atualizar overrides no package.json
function verificarOverrides() {
  imprimirCabecalho('VERIFICANDO OVERRIDES NO PACKAGE.JSON');
  
  const packageJson = lerPackageJson();
  if (!packageJson) return;
  
  // Verificar versões atuais
  const versaoReact = packageJson.dependencies?.react || packageJson.devDependencies?.react;
  const versaoReactNative = packageJson.dependencies?.['react-native'] || packageJson.devDependencies?.['react-native'];
  const versaoExpo = packageJson.dependencies?.expo || packageJson.devDependencies?.expo;
  
  imprimirInfo(`Versão atual do React: ${versaoReact || 'Não encontrada'}`);
  imprimirInfo(`Versão atual do React Native: ${versaoReactNative || 'Não encontrada'}`);
  imprimirInfo(`Versão atual do Expo: ${versaoExpo || 'Não encontrada'}`);
  
  // Verificar se já existe a seção overrides
  if (!packageJson.overrides) {
    imprimirAviso('Seção overrides não encontrada no package.json');
    imprimirInfo('Execute o script adicionar-overrides.js para adicionar overrides ao package.json');
  } else {
    imprimirSucesso('Seção overrides encontrada no package.json');
    
    // Verificar se os overrides contêm as dependências principais
    const temReact = packageJson.overrides.react !== undefined;
    const temReactNative = packageJson.overrides['react-native'] !== undefined;
    
    if (!temReact || !temReactNative) {
      imprimirAviso('Overrides não contêm todas as dependências principais');
      imprimirInfo('Execute o script adicionar-overrides.js para atualizar os overrides');
    } else {
      imprimirSucesso('Overrides contêm todas as dependências principais');
    }
  }
}

// Função para analisar dependências com pnpm why
function analisarDependencias() {
  imprimirCabecalho('ANALISANDO DEPENDÊNCIAS COM PNPM WHY');
  
  const packageJson = lerPackageJson();
  if (!packageJson) return;
  
  // Lista de dependências problemáticas comuns em projetos Expo/React Native
  const dependenciasProblematicas = [
    'react',
    'react-native',
    'expo',
    '@expo/metro-config',
    'metro',
    'metro-resolver',
    '@babel/core',
    '@babel/runtime'
  ];
  
  imprimirInfo('Analisando dependências problemáticas comuns...');
  
  for (const dependencia of dependenciasProblematicas) {
    imprimirInfo(`\nAnalisando dependência: ${dependencia}`);
    
    try {
      const resultado = execSync(`pnpm why ${dependencia}`, { encoding: 'utf8' });
      
      // Verificar se há múltiplas versões
      if (resultado.includes('has multiple versions')) {
        imprimirAviso(`Múltiplas versões encontradas para ${dependencia}`);
        console.log(`${cores.amarelo}${resultado.split('\n').slice(0, 10).join('\n')}${cores.reset}`);
        imprimirInfo(`Considere adicionar um override para ${dependencia} no package.json`);
      } else {
        imprimirSucesso(`Dependência ${dependencia} está correta`);
      }
    } catch (erro) {
      if (erro.status === 1 && erro.stdout.includes('not found')) {
        imprimirInfo(`Dependência ${dependencia} não encontrada no projeto`);
      } else {
        imprimirErro(`Erro ao analisar dependência ${dependencia}: ${erro.message}`);
      }
    }
  }
}

// Função para verificar atualizações de segurança
function verificarAtualizacoes() {
  imprimirCabecalho('VERIFICANDO ATUALIZAÇÕES DE SEGURANÇA');
  
  try {
    imprimirInfo('Executando npm audit...');
    const resultado = execSync('npm audit --json', { encoding: 'utf8' });
    
    try {
      const auditResult = JSON.parse(resultado);
      const vulnerabilities = auditResult.vulnerabilities || {};
      const totalVulnerabilities = Object.values(vulnerabilities).reduce((total, severity) => total + severity.length, 0);
      
      if (totalVulnerabilities > 0) {
        imprimirAviso(`Encontradas ${totalVulnerabilities} vulnerabilidades`);
        
        // Mostrar vulnerabilidades críticas e altas
        const criticas = vulnerabilities.critical || [];
        const altas = vulnerabilities.high || [];
        
        if (criticas.length > 0) {
          imprimirErro(`${criticas.length} vulnerabilidades críticas encontradas`);
          criticas.forEach(vuln => {
            console.log(`${cores.vermelho}${vuln.name}@${vuln.version}: ${vuln.title}${cores.reset}`);
          });
        }
        
        if (altas.length > 0) {
          imprimirAviso(`${altas.length} vulnerabilidades altas encontradas`);
          altas.forEach(vuln => {
            console.log(`${cores.amarelo}${vuln.name}@${vuln.version}: ${vuln.title}${cores.reset}`);
          });
        }
        
        imprimirInfo('\nConsidere executar npm audit fix para corrigir vulnerabilidades');
        imprimirAviso('⚠️ Ação de risco: npm audit fix --force (pode quebrar o projeto)');
      } else {
        imprimirSucesso('Nenhuma vulnerabilidade encontrada');
      }
    } catch (parseError) {
      imprimirErro(`Erro ao analisar resultado do npm audit: ${parseError.message}`);
    }
  } catch (erro) {
    if (erro.status === 1 && erro.stdout.includes('ENOLOCK')) {
      imprimirAviso('Arquivo package-lock.json não encontrado');
      imprimirInfo('Execute npm i --package-lock-only para gerar o arquivo package-lock.json');
    } else {
      imprimirErro(`Erro ao verificar atualizações: ${erro.message}`);
    }
  }
}

// Função para criar script de limpeza de cache
function criarScriptLimpezaCache() {
  imprimirCabecalho('VERIFICANDO SCRIPT DE LIMPEZA DE CACHE');
  
  const caminhoScript = path.resolve(__dirname, 'limpar-caches.bat');
  
  if (!verificarArquivo(caminhoScript)) {
    imprimirAviso('Script de limpeza de cache não encontrado');
    imprimirInfo('Criando script de limpeza de cache...');
    
    const conteudoScript = `@echo off
echo ===================================================
echo    LIMPANDO CACHES DO EXPO E DEPENDENCIAS
echo ===================================================

echo Encerrando processos Node.js anteriores...
taskkill /F /IM node.exe >nul 2>&1

echo Limpando cache do Expo...
if exist ".expo" (
  rmdir /S /Q ".expo"
  echo Cache do Expo removido com sucesso!
) else (
  echo Cache do Expo nao encontrado.
)

echo Limpando cache do Metro...
if exist ".metro-cache" (
  rmdir /S /Q ".metro-cache"
  echo Cache do Metro removido com sucesso!
) else (
  echo Cache do Metro nao encontrado.
)

echo Limpando cache do Node.js...
if exist "node_modules\.cache" (
  rmdir /S /Q "node_modules\.cache"
  echo Cache do Node.js removido com sucesso!
) else (
  echo Cache do Node.js nao encontrado.
)

echo Limpando cache do PNPM...
pnpm store prune

echo ===================================================
echo    LIMPEZA DE CACHE CONCLUIDA
echo ===================================================

echo Pressione qualquer tecla para sair...
pause > nul
`;
    
    try {
      fs.writeFileSync(caminhoScript, conteudoScript, 'utf8');
      imprimirSucesso('Script de limpeza de cache criado com sucesso');
    } catch (erro) {
      imprimirErro(`Erro ao criar script de limpeza de cache: ${erro.message}`);
    }
  } else {
    imprimirSucesso('Script de limpeza de cache encontrado');
  }
}

// Função para verificar script de inicialização otimizado
function verificarScriptInicializacao() {
  imprimirCabecalho('VERIFICANDO SCRIPT DE INICIALIZAÇÃO OTIMIZADO');
  
  const caminhoScript = path.resolve(__dirname, 'iniciar-expo-otimizado.bat');
  
  if (!verificarArquivo(caminhoScript)) {
    imprimirAviso('Script de inicialização otimizado não encontrado');
    imprimirInfo('Criando script de inicialização otimizado...');
    
    const conteudoScript = `@echo off
echo ===================================================
echo    INICIANDO EXPO COM CONFIGURACOES OTIMIZADAS
echo ===================================================

echo Encerrando processos Node.js anteriores...
taskkill /F /IM node.exe >nul 2>&1

echo Executando scripts de correcao...
node corrigir-ips.js
node corrigir-expo-router.js

echo Configurando variaveis de ambiente...
set EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
set REACT_NATIVE_PACKAGER_HOSTNAME=localhost

echo Configurando Node.js para utilizar ate 6GB de memoria
set NODE_OPTIONS=--max_old_space_size=6144

echo Limpando caches do Expo e Metro...
if exist ".expo" rmdir /S /Q ".expo"
if exist ".metro-cache" rmdir /S /Q ".metro-cache"
if exist "node_modules\.cache" rmdir /S /Q "node_modules\.cache"
pnpm store prune

echo Iniciando Expo...
npx expo start --clear
`;
    
    try {
      fs.writeFileSync(caminhoScript, conteudoScript, 'utf8');
      imprimirSucesso('Script de inicialização otimizado criado com sucesso');
    } catch (erro) {
      imprimirErro(`Erro ao criar script de inicialização otimizado: ${erro.message}`);
    }
  } else {
    imprimirSucesso('Script de inicialização otimizado encontrado');
    
    // Verificar se o script contém as configurações necessárias
    const conteudoScript = fs.readFileSync(caminhoScript, 'utf8');
    
    if (!conteudoScript.includes('max_old_space_size=6144')) {
      imprimirAviso('Script de inicialização não contém configuração de memória otimizada');
      imprimirInfo('Considere atualizar o script com a configuração de memória:');
      console.log(`${cores.ciano}set NODE_OPTIONS=--max_old_space_size=6144${cores.reset}`);
    } else {
      imprimirSucesso('Script de inicialização contém configuração de memória otimizada');
    }
  }
}

// Função principal
function main() {
  console.log(`\n${cores.negrito}${cores.magenta}🔧 GERENCIAMENTO DE DEPENDÊNCIAS E OTIMIZAÇÃO${cores.reset}\n`);
  
  // 1. Gerenciamento de dependências
  verificarNpmrc();
  verificarOverrides();
  
  // 2. Otimização de desempenho
  verificarMetroConfig();
  criarScriptLimpezaCache();
  verificarScriptInicializacao();
  
  // 3. Manutenção contínua
  analisarDependencias();
  verificarAtualizacoes();
  
  console.log(`\n${cores.negrito}${cores.verde}✅ VERIFICAÇÃO CONCLUÍDA${cores.reset}\n`);
  console.log(`${cores.negrito}${cores.ciano}PRÓXIMOS PASSOS:${cores.reset}`);
  console.log(`
1. Execute ${cores.ciano}cmd.exe /c limpar-caches.bat${cores.reset} para limpar os caches
2. Execute ${cores.ciano}pnpm install --force${cores.reset} para aplicar os overrides
3. Execute ${cores.ciano}cmd.exe /c iniciar-expo-otimizado.bat${cores.reset} para iniciar o aplicativo
`);
}

// Executar função principal
main();