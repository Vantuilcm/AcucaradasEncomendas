/**
 * Script para resolver conflitos específicos de dependências em projetos Expo/React Native
 * 
 * Este script identifica e resolve problemas comuns de dependências em projetos Expo:
 * - Conflitos entre versões do React e React Native
 * - Problemas com o Metro Bundler
 * - Conflitos com o expo-router
 * - Dependências duplicadas que causam problemas de memória
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

// Função para verificar conflitos específicos do React Native e Expo
function verificarConflitosExpo() {
  imprimirCabecalho('VERIFICANDO CONFLITOS ESPECÍFICOS DO EXPO/REACT NATIVE');
  
  const packageJson = lerPackageJson();
  if (!packageJson) return;
  
  // Verificar versões do React e React Native
  const versaoReact = packageJson.dependencies?.react || packageJson.devDependencies?.react;
  const versaoReactNative = packageJson.dependencies?.['react-native'] || packageJson.devDependencies?.['react-native'];
  const versaoExpo = packageJson.dependencies?.expo || packageJson.devDependencies?.expo;
  const versaoExpoRouter = packageJson.dependencies?.['expo-router'] || packageJson.devDependencies?.['expo-router'];
  
  imprimirInfo(`Versão do React: ${versaoReact || 'Não encontrada'}`);
  imprimirInfo(`Versão do React Native: ${versaoReactNative || 'Não encontrada'}`);
  imprimirInfo(`Versão do Expo: ${versaoExpo || 'Não encontrada'}`);
  imprimirInfo(`Versão do Expo Router: ${versaoExpoRouter || 'Não encontrada'}`);
  
  // Verificar compatibilidade entre React e React Native
  if (versaoReact && versaoReactNative) {
    const versaoReactSemCaracteres = versaoReact.replace(/[^0-9.]/g, '');
    const versaoReactNativeSemCaracteres = versaoReactNative.replace(/[^0-9.]/g, '');
    
    const versaoReactMajor = parseInt(versaoReactSemCaracteres.split('.')[0], 10);
    const versaoReactNativeMajor = parseInt(versaoReactNativeSemCaracteres.split('.')[0], 10);
    
    if (versaoReactMajor >= 18 && versaoReactNativeMajor < 0.70) {
      imprimirAviso(`Possível incompatibilidade: React ${versaoReact} pode não ser totalmente compatível com React Native ${versaoReactNative}`);
      imprimirInfo('Recomendação: Atualize o React Native para uma versão compatível com React 18+');
    } else {
      imprimirSucesso(`Versões do React e React Native parecem compatíveis`);
    }
  }
  
  // Verificar compatibilidade entre Expo e React Native
  if (versaoExpo && versaoReactNative) {
    const versaoExpoSemCaracteres = versaoExpo.replace(/[^0-9.]/g, '');
    const versaoExpoMajor = parseInt(versaoExpoSemCaracteres.split('.')[0], 10);
    
    if (versaoExpoMajor >= 49) {
      imprimirInfo(`Expo SDK ${versaoExpoMajor} detectado - verificando compatibilidade...`);
      
      // Verificar se o .npmrc está configurado corretamente para o Expo 49+
      const caminhoNpmrc = path.resolve(__dirname, '.npmrc');
      if (verificarArquivo(caminhoNpmrc)) {
        const conteudoNpmrc = fs.readFileSync(caminhoNpmrc, 'utf8');
        
        if (!conteudoNpmrc.includes('public-hoist-pattern[]=*expo*') || 
            !conteudoNpmrc.includes('public-hoist-pattern[]=*react*')) {
          imprimirAviso('O arquivo .npmrc não contém os padrões de hoisting necessários para o Expo 49+');
          imprimirInfo('Recomendação: Adicione os seguintes padrões ao .npmrc:');
          console.log(`
public-hoist-pattern[]=*expo*
public-hoist-pattern[]=*react*
public-hoist-pattern[]=*metro*
public-hoist-pattern[]=*expo-router*
`);
        } else {
          imprimirSucesso('O arquivo .npmrc contém os padrões de hoisting necessários');
        }
      } else {
        imprimirAviso('Arquivo .npmrc não encontrado - recomendado para projetos Expo 49+');
      }
    }
  }
  
  // Verificar configuração do Metro Bundler
  const caminhoMetroConfig = path.resolve(__dirname, 'metro.config.js');
  if (verificarArquivo(caminhoMetroConfig)) {
    const conteudoMetroConfig = fs.readFileSync(caminhoMetroConfig, 'utf8');
    
    // Verificar se há configuração de maxWorkers
    if (conteudoMetroConfig.includes('maxWorkers')) {
      imprimirSucesso('Configuração de maxWorkers encontrada no metro.config.js');
    } else {
      imprimirAviso('Recomendado adicionar limitação de maxWorkers no metro.config.js para evitar problemas de memória');
      imprimirInfo('Exemplo: maxWorkers: 2,');
    }
    
    // Verificar se há configuração de extraNodeModules
    if (conteudoMetroConfig.includes('extraNodeModules')) {
      imprimirSucesso('Configuração de aliases (extraNodeModules) encontrada no metro.config.js');
    } else {
      imprimirAviso('Recomendado adicionar aliases no metro.config.js para resolver problemas de módulos duplicados');
    }
    
    // Verificar se há configuração de resetCache
    if (conteudoMetroConfig.includes('resetCache')) {
      imprimirSucesso('Configuração de resetCache encontrada no metro.config.js');
    } else {
      imprimirInfo('Considere adicionar resetCache: true no metro.config.js para resolver problemas de cache');
    }
  } else {
    imprimirAviso('Arquivo metro.config.js não encontrado');
  }
  
  // Verificar problemas específicos do expo-router
  if (versaoExpoRouter) {
    imprimirInfo('\nVerificando configuração do expo-router...');
    
    // Verificar se o arquivo entry.js existe
    const caminhoEntryJs = path.resolve(__dirname, 'node_modules', 'expo-router', 'entry.js');
    if (verificarArquivo(caminhoEntryJs)) {
      imprimirSucesso('Arquivo entry.js encontrado em expo-router');
    } else {
      imprimirAviso('Arquivo entry.js não encontrado em expo-router - pode causar problemas de carregamento');
      imprimirInfo('Recomendação: Execute o script corrigir-expo-router.js');
    }
    
    // Verificar package.json do expo-router
    const caminhoPackageJsonExpoRouter = path.resolve(__dirname, 'node_modules', 'expo-router', 'package.json');
    if (verificarArquivo(caminhoPackageJsonExpoRouter)) {
      try {
        const packageJsonExpoRouter = JSON.parse(fs.readFileSync(caminhoPackageJsonExpoRouter, 'utf8'));
        if (packageJsonExpoRouter.main === './entry.js') {
          imprimirSucesso('Campo main no package.json do expo-router está configurado corretamente');
        } else {
          imprimirAviso(`Campo main no package.json do expo-router está configurado como ${packageJsonExpoRouter.main} em vez de ./entry.js`);
          imprimirInfo('Recomendação: Execute o script corrigir-expo-router.js');
        }
      } catch (erro) {
        imprimirErro(`Erro ao ler package.json do expo-router: ${erro.message}`);
      }
    } else {
      imprimirAviso('package.json do expo-router não encontrado');
    }
  }
}

// Função para verificar e corrigir problemas de memória
function verificarProblemasMemoria() {
  imprimirCabecalho('VERIFICANDO PROBLEMAS DE MEMÓRIA');
  
  // Verificar configuração de memória nos scripts de inicialização
  const scripts = [
    'iniciar-expo-ip-correto.bat',
    'iniciar-expo-qrcode-fixo.bat',
    'iniciar-expo-otimizado.bat'
  ];
  
  let configuracaoMemoriaEncontrada = false;
  
  for (const script of scripts) {
    const caminhoScript = path.resolve(__dirname, script);
    if (verificarArquivo(caminhoScript)) {
      const conteudoScript = fs.readFileSync(caminhoScript, 'utf8');
      
      if (conteudoScript.includes('--max_old_space_size=')) {
        const match = conteudoScript.match(/--max_old_space_size=(\d+)/);
        if (match && match[1]) {
          const tamanhoMemoria = parseInt(match[1], 10);
          imprimirSucesso(`Script ${script} configura ${tamanhoMemoria}MB de memória para o Node.js`);
          configuracaoMemoriaEncontrada = true;
          
          // Verificar se a configuração de memória é adequada
          if (tamanhoMemoria < 4096) {
            imprimirAviso(`A configuração de memória (${tamanhoMemoria}MB) pode ser insuficiente para projetos Expo complexos`);
            imprimirInfo('Recomendação: Aumente para pelo menos 4096MB (4GB) ou 6144MB (6GB) se disponível');
          } else if (tamanhoMemoria > 6144) {
            imprimirInfo(`A configuração de memória (${tamanhoMemoria}MB) é alta - certifique-se de que seu sistema tem memória suficiente`);
          }
        }
      }
    }
  }
  
  if (!configuracaoMemoriaEncontrada) {
    imprimirAviso('Nenhuma configuração de memória encontrada nos scripts de inicialização');
    imprimirInfo('Recomendação: Adicione NODE_OPTIONS=--max_old_space_size=4096 ou 6144 aos scripts de inicialização');
  }
  
  // Verificar configuração do Metro Bundler para otimização de memória
  const caminhoMetroConfig = path.resolve(__dirname, 'metro.config.js');
  if (verificarArquivo(caminhoMetroConfig)) {
    const conteudoMetroConfig = fs.readFileSync(caminhoMetroConfig, 'utf8');
    
    // Verificar configurações que afetam o consumo de memória
    const configuracoesMemoria = {
      'maxWorkers': conteudoMetroConfig.includes('maxWorkers'),
      'resetCache': conteudoMetroConfig.includes('resetCache'),
      'disableHierarchicalLookup': conteudoMetroConfig.includes('disableHierarchicalLookup'),
      'watchFolders': conteudoMetroConfig.includes('watchFolders')
    };
    
    imprimirInfo('\nConfigurações do Metro Bundler que afetam o consumo de memória:');
    for (const [config, encontrada] of Object.entries(configuracoesMemoria)) {
      if (encontrada) {
        imprimirSucesso(`${config}: Configurado`);
      } else {
        imprimirInfo(`${config}: Não configurado`);
      }
    }
  }
}

// Função para sugerir otimizações específicas para o Expo
function sugerirOtimizacoesExpo() {
  imprimirCabecalho('SUGESTÕES DE OTIMIZAÇÃO PARA EXPO/REACT NATIVE');
  
  imprimirInfo('Recomendações para melhorar o desempenho e resolver conflitos:');
  console.log(`
1. ${cores.verde}Limpe os caches regularmente${cores.reset}
   - Remova as pastas .expo e .metro-cache antes de iniciar o aplicativo
   - Execute pnpm store prune para limpar o cache do PNPM

2. ${cores.verde}Otimize a configuração do Metro Bundler${cores.reset}
   - Limite o número de workers (maxWorkers: 2)
   - Adicione aliases para módulos problemáticos
   - Desative o Watchman se estiver causando problemas

3. ${cores.verde}Gerencie a memória eficientemente${cores.reset}
   - Configure NODE_OPTIONS=--max_old_space_size=6144 para projetos complexos
   - Feche outros aplicativos que consomem muita memória antes de iniciar o Expo
   - Considere adicionar swap se a memória física for limitada

4. ${cores.verde}Resolva conflitos de dependências${cores.reset}
   - Use o arquivo .npmrc com configurações de hoisting adequadas
   - Adicione overrides no package.json para forçar versões específicas
   - Mantenha as versões do React e React Native compatíveis

5. ${cores.verde}Otimize o ambiente de desenvolvimento${cores.reset}
   - Use um IP fixo para evitar problemas de conexão
   - Configure corretamente as variáveis de ambiente EXPO_DEVTOOLS_LISTEN_ADDRESS e REACT_NATIVE_PACKAGER_HOSTNAME
   - Considere usar o EAS Build para builds em nuvem se os builds locais forem problemáticos
`);
}

// Função principal
function main() {
  console.log(`\n${cores.negrito}${cores.magenta}🔍 ANÁLISE DE CONFLITOS EXPO/REACT NATIVE${cores.reset}\n`);
  
  verificarConflitosExpo();
  verificarProblemasMemoria();
  sugerirOtimizacoesExpo();
  
  console.log(`\n${cores.negrito}${cores.verde}✅ ANÁLISE CONCLUÍDA${cores.reset}\n`);
  console.log(`${cores.negrito}${cores.azul}Para iniciar o Expo com configurações otimizadas, execute:${cores.reset}`);
  console.log(`${cores.ciano}cmd.exe /c iniciar-expo-otimizado.bat${cores.reset}\n`);
}

// Executar função principal
main();