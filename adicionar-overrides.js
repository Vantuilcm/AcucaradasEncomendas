/**
 * Script para adicionar overrides no package.json
 * 
 * Este script adiciona configurações de overrides no package.json para resolver
 * conflitos comuns de dependências em projetos Expo/React Native.
 */

const fs = require('fs');
const path = require('path');

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

// Função para adicionar overrides ao package.json
function adicionarOverrides() {
  imprimirCabecalho('ADICIONANDO OVERRIDES AO PACKAGE.JSON');
  
  const packageJson = lerPackageJson();
  if (!packageJson) return;
  
  // Verificar versões atuais
  const versaoReact = packageJson.dependencies?.react || packageJson.devDependencies?.react;
  const versaoReactNative = packageJson.dependencies?.['react-native'] || packageJson.devDependencies?.['react-native'];
  const versaoExpo = packageJson.dependencies?.expo || packageJson.devDependencies?.expo;
  
  imprimirInfo(`Versão atual do React: ${versaoReact || 'Não encontrada'}`);
  imprimirInfo(`Versão atual do React Native: ${versaoReactNative || 'Não encontrada'}`);
  imprimirInfo(`Versão atual do Expo: ${versaoExpo || 'Não encontrada'}`);
  
  // Definir overrides com base nas versões atuais
  const overrides = {};
  
  // Adicionar overrides para React
  if (versaoReact) {
    overrides['react'] = versaoReact;
    imprimirInfo(`Adicionando override para React: ${versaoReact}`);
  }
  
  // Adicionar overrides para React Native
  if (versaoReactNative) {
    overrides['react-native'] = versaoReactNative;
    imprimirInfo(`Adicionando override para React Native: ${versaoReactNative}`);
  }
  
  // Adicionar overrides para dependências problemáticas comuns
  overrides['@expo/config-plugins'] = '*';
  overrides['@expo/metro-config'] = '*';
  overrides['metro'] = '*';
  overrides['metro-resolver'] = '*';
  
  imprimirInfo('Adicionando overrides para dependências problemáticas comuns');
  
  // Verificar se já existe a seção overrides
  if (packageJson.overrides) {
    imprimirAviso('Seção overrides já existe no package.json');
    imprimirInfo('Mesclando overrides existentes com os novos...');
    
    // Mesclar overrides existentes com os novos
    packageJson.overrides = { ...packageJson.overrides, ...overrides };
  } else {
    // Adicionar nova seção overrides
    packageJson.overrides = overrides;
  }
  
  // Verificar se já existe a seção resolutions (para Yarn)
  if (!packageJson.resolutions) {
    imprimirInfo('Adicionando seção resolutions para compatibilidade com Yarn');
    packageJson.resolutions = { ...overrides };
  } else {
    imprimirInfo('Mesclando resolutions existentes com os novos...');
    packageJson.resolutions = { ...packageJson.resolutions, ...overrides };
  }
  
  // Salvar o package.json atualizado
  if (salvarPackageJson(packageJson)) {
    imprimirSucesso('Overrides adicionados com sucesso ao package.json');
    imprimirInfo('\nPróximos passos:');
    console.log(`
1. Execute ${cores.ciano}pnpm install --force${cores.reset} para aplicar os overrides
2. Limpe os caches com ${cores.ciano}pnpm store prune${cores.reset}
3. Reinicie o aplicativo com ${cores.ciano}cmd.exe /c iniciar-expo-otimizado.bat${cores.reset}
`);
  }
}

// Função para criar script de limpeza de cache
function criarScriptLimpezaCache() {
  imprimirCabecalho('CRIANDO SCRIPT DE LIMPEZA DE CACHE');
  
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
  
  const caminhoScript = path.resolve(__dirname, 'limpar-caches.bat');
  
  try {
    fs.writeFileSync(caminhoScript, conteudoScript, 'utf8');
    imprimirSucesso(`Script de limpeza de cache criado com sucesso: ${caminhoScript}`);
  } catch (erro) {
    imprimirErro(`Erro ao criar script de limpeza de cache: ${erro.message}`);
  }
}

// Função principal
function main() {
  console.log(`\n${cores.negrito}${cores.magenta}🔧 CONFIGURAÇÃO DE OVERRIDES PARA RESOLVER CONFLITOS${cores.reset}\n`);
  
  adicionarOverrides();
  criarScriptLimpezaCache();
  
  console.log(`\n${cores.negrito}${cores.verde}✅ CONFIGURAÇÃO CONCLUÍDA${cores.reset}\n`);
}

// Executar função principal
main();